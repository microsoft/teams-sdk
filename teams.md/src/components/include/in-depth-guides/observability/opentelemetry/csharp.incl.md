<!-- prerequisites -->

Install the Teams SDK and OpenTelemetry packages:

```bash
dotnet add package Microsoft.Teams.Apps --prerelease
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.Http
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
```

For Azure Monitor / Application Insights export, also add:

```bash
dotnet add package Azure.Monitor.OpenTelemetry.AspNetCore
```

Or start from the [OTelBotWithAspire sample](https://github.com/microsoft/teams-agent-accelerator-templates/tree/main/dotnet/OTelBotWithAspire), which includes all dependencies pre-configured through [.NET Aspire service defaults](https://learn.microsoft.com/dotnet/aspire/fundamentals/service-defaults).

<!-- setup -->

Register the Teams SDK's telemetry sources when configuring OpenTelemetry. The key lines are `AddSource` and `AddMeter` — everything else is standard OpenTelemetry .NET setup:

```csharp
using Microsoft.Teams.Apps.Diagnostics;
using Microsoft.Teams.Core.Diagnostics;

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing.AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation();
        tracing.AddSource([CoreTelemetryNames.ActivitySourceName,   // "Microsoft.Teams.Core"
                           TeamsBotApplicationTelemetry.ActivitySourceName]); // "Microsoft.Teams.Apps"
    })
    .WithMetrics(metrics =>
    {
        metrics.AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation();
        metrics.AddMeter([CoreTelemetryNames.MeterName,
                          TeamsBotApplicationTelemetry.MeterName]);
    });
```

<!-- logging-setup -->

Enable OpenTelemetry log export so that `ILogger` output flows to the same backend as your traces and metrics:

```csharp
builder.Logging.AddOpenTelemetry(logging =>
{
    logging.IncludeFormattedMessage = true;
    logging.IncludeScopes = true;
});
```

Setting `IncludeScopes = true` preserves log scopes as custom properties in your backend — useful for filtering by conversation ID, tenant ID, or other contextual values.

<!-- azure-monitor -->

To export to [Azure Monitor / Application Insights](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable), set the `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable and call `UseAzureMonitor()`:

```csharp
using Azure.Monitor.OpenTelemetry.AspNetCore;

if (!string.IsNullOrEmpty(builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]))
{
    builder.Services.AddOpenTelemetry().UseAzureMonitor();
}
```

`UseAzureMonitor()` bundles instrumentation and exporters for traces, metrics, logs, and Live Metrics. In the Application Insights portal, you can inspect each turn end-to-end — from the inbound HTTP request through middleware, handler dispatch, and outbound Bot Service calls — all in a single correlated trace view.

> **Note:** Azure Monitor enables [trace-based log sampling](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-configuration#logs) by default, keeping logs aligned with trace sampling decisions. Review the sampling configuration for production workloads.

<!-- local-aspire -->

The [OTelBotWithAspire sample](https://github.com/microsoft/teams-agent-accelerator-templates/tree/main/dotnet/OTelBotWithAspire) includes an Aspire AppHost that orchestrates the bot and automatically provides the dashboard. Run the AppHost project and the dashboard opens at `http://localhost:18888`:

```csharp
// OTelBotWithAspire.AppHost/AppHost.cs
IDistributedApplicationBuilder builder = DistributedApplication.CreateBuilder(args);
builder.AddProject<Projects.OTelBot>("otelbot");
builder.Build().Run();
```

Alternatively, run the [standalone Aspire Dashboard](https://learn.microsoft.com/dotnet/aspire/fundamentals/dashboard/standalone) as a Docker container:

```bash
docker run --rm -d --name aspire-dashboard \
  -p 18888:18888 -p 4317:18889 \
  mcr.microsoft.com/dotnet/aspire-dashboard:latest

export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_SERVICE_NAME=my-teams-bot

dotnet run
```

<!-- local-grafana -->

```bash
docker run --rm -d --name lgtm \
  -p 3000:3000 -p 4317:4317 -p 4318:4318 \
  grafana/otel-lgtm

export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_SERVICE_NAME=my-teams-bot

dotnet run
```

Open `http://localhost:3000` (default credentials: `admin` / `admin`) to explore Tempo for traces, Mimir for metrics, and Loki for logs.

<!-- resource-config -->

[Resource attributes](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-configuration#set-the-cloud-role-name-and-the-cloud-role-instance) identify your service in the backend. At a minimum, set `service.name` so your bot is distinguishable in Application Map and trace views:

```csharp
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r
        .AddService(
            serviceName: "my-teams-bot",
            serviceVersion: "1.0.0",
            serviceNamespace: "Contoso.Agents"));
```

For production, also consider setting `deployment.environment` so you can filter between staging and production:

```csharp
.ConfigureResource(r => r
    .AddService(serviceName: "my-teams-bot", serviceVersion: "1.0.0")
    .AddAttributes(new Dictionary<string, object>
    {
        ["deployment.environment"] = builder.Environment.EnvironmentName,
        ["service.namespace"] = "Contoso.Agents",
    }))
```

If multiple bots share the same Application Insights resource, `service.name` and `service.namespace` are what separate them in the [Application Map](https://learn.microsoft.com/azure/azure-monitor/app/app-map).

> **Note:** When using .NET Aspire, the AppHost automatically sets `service.name` from the project name passed to `AddProject<T>("name")`, so you typically don't need to configure it manually.

<!-- aspire-example -->

The [OTelBotWithAspire sample](https://github.com/microsoft/teams-agent-accelerator-templates/tree/main/dotnet/OTelBotWithAspire) is a ready-to-run Aspire solution with three projects:

| Project | Purpose |
| --- | --- |
| `OTelBot` | The Teams bot — `Program.cs` is 18 lines |
| `OTelBotWithAspire.ServiceDefaults` | OpenTelemetry, health checks, and service discovery |
| `OTelBotWithAspire.AppHost` | Aspire orchestrator that launches the bot with the dashboard |

The bot's `Program.cs` stays minimal because all observability is configured in service defaults:

```csharp
using Microsoft.Teams.Apps;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();
builder.Services.AddTeamsBotApplication();
WebApplication app = builder.Build();

TeamsBotApplication bot = app.UseTeamsBotApplication();

bot.OnMessage(async (ctx, ct) =>
{
    string? message = ctx.Activity.TextWithoutMentions;
    await ctx.SendActivityAsync($"Echo: {message}", ct);
});

app.MapDefaultEndpoints();
app.Run();
```

`AddServiceDefaults()` configures OpenTelemetry (traces, metrics, logs), health checks, service discovery, and resilience — all through the standard [.NET Aspire service defaults](https://learn.microsoft.com/dotnet/aspire/fundamentals/service-defaults) pattern. The service defaults register the Teams SDK's `ActivitySource` and `Meter` names, and conditionally enable OTLP and Azure Monitor exporters based on environment variables.

<!-- full-example -->

If you are not using .NET Aspire, here is a standalone `Program.cs` that wires up a Teams bot with OpenTelemetry tracing, metrics, and logs — exporting to OTLP and optionally to Azure Monitor:

```csharp
using Azure.Monitor.OpenTelemetry.AspNetCore;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Diagnostics;
using Microsoft.Teams.Core.Diagnostics;
using OpenTelemetry.Resources;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddTeamsBotApplication();

// --- OpenTelemetry ---
var otel = builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r
        .AddService(serviceName: "my-teams-bot", serviceVersion: "1.0.0")
        .AddAttributes(new Dictionary<string, object>
        {
            ["deployment.environment"] = builder.Environment.EnvironmentName,
        }));

// Azure Monitor (requires APPLICATIONINSIGHTS_CONNECTION_STRING env var)
if (!string.IsNullOrEmpty(builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]))
{
    otel.UseAzureMonitor();
}

// Traces: Teams SDK sources + auto-instrumentation + OTLP export
otel.WithTracing(tracing =>
{
    tracing.AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation();
    tracing.AddSource([CoreTelemetryNames.ActivitySourceName,
                       TeamsBotApplicationTelemetry.ActivitySourceName]);
    tracing.AddOtlpExporter();
});

// Metrics: Teams SDK meters + auto-instrumentation + OTLP export
otel.WithMetrics(metrics =>
{
    metrics.AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation();
    metrics.AddMeter([CoreTelemetryNames.MeterName,
                      TeamsBotApplicationTelemetry.MeterName]);
    metrics.AddOtlpExporter();
});

// Logs: correlated to active traces
builder.Logging.AddOpenTelemetry(logging =>
{
    logging.IncludeFormattedMessage = true;
    logging.IncludeScopes = true;
});

// --- App ---
WebApplication app = builder.Build();

TeamsBotApplication bot = app.UseTeamsBotApplication();

bot.OnMessage(async (ctx, ct) =>
{
    string? message = ctx.Activity.TextWithoutMentions;
    await ctx.SendActivityAsync($"Echo: {message}", ct);
});

app.Run();
```

Run with a local OTLP collector (Aspire Dashboard or Grafana LGTM) to see traces, metrics, and correlated logs for every turn. Set `APPLICATIONINSIGHTS_CONNECTION_STRING` to additionally export to Azure Monitor.
