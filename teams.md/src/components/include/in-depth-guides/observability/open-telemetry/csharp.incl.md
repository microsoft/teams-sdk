<!-- activity-sources-and-meters -->

The Teams SDK exposes four names you need to register:

| Constant | Value | Kind |
|----------|-------|------|
| `CoreTelemetryNames.ActivitySourceName` | `Microsoft.Teams.Core` | `ActivitySource` |
| `TeamsBotApplicationTelemetry.ActivitySourceName` | `Microsoft.Teams.Apps` | `ActivitySource` |
| `CoreTelemetryNames.MeterName` | `Microsoft.Teams.Core` | `Meter` |
| `TeamsBotApplicationTelemetry.MeterName` | `Microsoft.Teams.Apps` | `Meter` |

<!-- package-install -->

```xml
<PackageReference Include="Microsoft.Teams.Apps" Version="2.*" />
<PackageReference Include="Microsoft.OpenTelemetry" Version="1.*" />
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.*" />
```

`Microsoft.OpenTelemetry` is the Microsoft OpenTelemetry distro — it bundles ASP.NET Core, HttpClient, and Azure SDK auto-instrumentation and provides the `UseMicrosoftOpenTelemetry` extension. The OTLP exporter package is optional; include it when you want to send telemetry to a Grafana, Jaeger, or other OTLP-compatible backend.

<!-- setup -->

```csharp
using Microsoft.OpenTelemetry;
using Microsoft.Teams.Apps.Diagnostics;
using Microsoft.Teams.Core.Diagnostics;
using OpenTelemetry;

string[] activitySources =
[
    CoreTelemetryNames.ActivitySourceName,
    TeamsBotApplicationTelemetry.ActivitySourceName,
];

string[] meterNames =
[
    CoreTelemetryNames.MeterName,
    TeamsBotApplicationTelemetry.MeterName,
];

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddTeamsBotApplication();

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService(serviceName: "my-teams-bot"))
    .UseMicrosoftOpenTelemetry(o =>
    {
        // Console exporter is handy for local development; remove for production.
        // OTLP exporter reads OTEL_EXPORTER_OTLP_ENDPOINT from env.
        o.Exporters = ExportTarget.Console | ExportTarget.Otlp;

        o.Instrumentation.EnableHttpClientInstrumentation = true;
        o.Instrumentation.EnableAspNetCoreInstrumentation = true;
    })
    .WithTracing(t => t.AddSource(activitySources))
    .WithMetrics(m => m.AddMeter(meterNames));

// Bridge ILogger records into the OTel pipeline so they carry TraceId/SpanId.
builder.Logging.AddOpenTelemetry(o => o.IncludeFormattedMessage = true);

WebApplication app = builder.Build();
app.UseTeamsBotApplication();
app.Run();
```

The two `.AddSource()` and `.AddMeter()` calls are the only Teams-specific wiring. Everything else is standard OTel configuration.

<!-- trace-hierarchy -->

```
HTTP server span                       (auto — OTel ASP.NET Core)
└─ turn                                (Microsoft.Teams.Core)
   ├─ middleware  [once per middleware] (Microsoft.Teams.Core)
   ├─ handler                          (Microsoft.Teams.Apps)
   └─ conversation_client              (Microsoft.Teams.Core)
      ├─ auth.outbound                 (Microsoft.Teams.Core)
      │  └─ HTTP client span           (auto — token endpoint)
      └─ HTTP client span              (auto — Bot Service API)
```

<!-- metrics -->

Import `Microsoft.Teams.Core.Diagnostics` and `Microsoft.Teams.Apps.Diagnostics` to access the constant names at compile time rather than using bare strings.

<!-- log-correlation -->

```csharp
// Standard ILogger injection — no extra setup needed.
// The OTel log bridge picks up TraceId/SpanId automatically when Logging.AddOpenTelemetry is called.
app.OnMessage(async (context, cancellationToken) =>
{
    // context.Log writes via ILogger; the active span's TraceId/SpanId are included automatically.
    context.Log.Info("Handling message from {UserId}", context.Activity.From.Id);
    await context.Send("Got it!", cancellationToken);
});
```

Because the `turn` span is active during handler execution, every log record produced inside a turn automatically carries the same `TraceId` and `SpanId`. In Grafana, you can click a slow trace in Tempo and jump directly to the correlated log lines in Loki.

<!-- run-with-lgtm -->

```bash
# Start Grafana LGTM (Tempo + Mimir + Loki + Grafana)
docker run --rm -d --name lgtm \
  -p 3000:3000 -p 4317:4317 -p 4318:4318 \
  grafana/otel-lgtm

# Point the OTLP exporter at the local collector
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_SERVICE_NAME=my-teams-bot
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=local,service.version=dev"

dotnet run
```

Open [http://localhost:3000](http://localhost:3000) (default credentials `admin` / `admin`) to explore:

- **Explore → Tempo** — distributed traces, one per incoming activity
- **Explore → Mimir** — `teams_*` Prometheus metrics (use `teams_turn_duration_milliseconds_bucket` for latency histograms)
- **Explore → Loki** — structured logs correlated to their trace via `TraceId`

![Grafana Tempo showing the full turn span tree for a Teams bot activity](/screenshots/otel-grafana-tempo-trace.png)

![Grafana Mimir displaying teams.turn.duration and teams.activities.received metrics](/screenshots/otel-grafana-mimir-metrics.png)

![Grafana Loki log lines with TraceId and SpanId fields correlated to a Tempo trace](/screenshots/otel-grafana-loki-logs.png)

<!-- export-targets -->

`ExportTarget` is a flags enum from the Microsoft OpenTelemetry distro. Combine values with `|`:

| Value | Destination |
|-------|-------------|
| `ExportTarget.Console` | Standard output — useful for local development |
| `ExportTarget.Otlp` | Any OTLP-compatible backend (Grafana, Jaeger, Zipkin, etc.) |
| `ExportTarget.AzureMonitor` | Azure Monitor / Application Insights (reads `APPLICATIONINSIGHTS_CONNECTION_STRING`) |
| `ExportTarget.Agent365` | Microsoft 365 observability platform |

For production deployments, use `ExportTarget.Otlp` or `ExportTarget.AzureMonitor` (or both). Remove `ExportTarget.Console` to avoid performance overhead.

```csharp
// Production example: OTLP + Azure Monitor
o.Exporters = ExportTarget.Otlp | ExportTarget.AzureMonitor;
```

Set `APPLICATIONINSIGHTS_CONNECTION_STRING` in your environment or `appsettings.json` to enable the Azure Monitor exporter. The OTLP endpoint is read from `OTEL_EXPORTER_OTLP_ENDPOINT`.

![Application Insights application map showing dependencies between the Teams bot, the token endpoint, and the Bot Service API](/screenshots/otel-appinsights-map.png)
