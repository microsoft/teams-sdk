---
slug: open-telemetry-for-teams-bots
title: "Production Observability for Teams Bots with OpenTelemetry"
date: 2026-06-10
authors:
  - name: Microsoft Teams SDK
    title: Microsoft
    url: https://github.com/microsoft
    image_url: https://github.com/microsoft.png
tags: [teams-sdk, dotnet, observability, opentelemetry]
description: Learn how to add distributed traces, metrics, and correlated logs to your Teams bot using the Teams SDK's built-in OpenTelemetry support — with a live Grafana dashboard in under five minutes.
---

Your Teams bot handles dozens of activity types — messages, adaptive card submits, OAuth callbacks, proactive sends — and when something goes wrong in production you need to know exactly which turn failed, why, and how long it took. The Teams SDK for .NET ships first-class OpenTelemetry support so you can answer all three questions without adding a single line of tracing code to your handlers.

<!-- truncate -->

## What the SDK Emits

Every incoming activity produces a span tree that maps 1:1 to the SDK's execution model:

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

The SDK also registers a set of named metrics — counters and histograms — under the `Microsoft.Teams.Core` and `Microsoft.Teams.Apps` meters:

| Metric | What it tells you |
|--------|-------------------|
| `teams.activities.received` | Volume by activity type |
| `teams.turn.duration` | End-to-end latency histogram |
| `teams.handler.errors` | Unhandled exception rate |
| `teams.middleware.duration` | Per-middleware cost |
| `teams.outbound.calls` / `teams.outbound.errors` | Bot Service API call volume and error rate |

And because the `turn` span is always active when your handlers run, every `ILogger` record your code writes automatically carries the active `TraceId` and `SpanId` — so you can jump from a slow trace directly to its log lines.

## Wiring It Up

The Teams SDK uses standard `ActivitySource` and `Meter` APIs, so you subscribe to it exactly the same way you subscribe to any other OTel library: by name. The only Teams-specific step is calling `.AddSource()` and `.AddMeter()` with the SDK's constant names.

```csharp
using Microsoft.OpenTelemetry;
using Microsoft.Teams.Apps.Diagnostics;
using Microsoft.Teams.Core.Diagnostics;

string[] activitySources =
[
    CoreTelemetryNames.ActivitySourceName,        // "Microsoft.Teams.Core"
    TeamsBotApplicationTelemetry.ActivitySourceName, // "Microsoft.Teams.Apps"
];

string[] meterNames =
[
    CoreTelemetryNames.MeterName,
    TeamsBotApplicationTelemetry.MeterName,
];

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("my-teams-bot"))
    .UseMicrosoftOpenTelemetry(o =>
    {
        o.Exporters = ExportTarget.Console | ExportTarget.Otlp;
        o.Instrumentation.EnableHttpClientInstrumentation = true;
        o.Instrumentation.EnableAspNetCoreInstrumentation = true;
    })
    .WithTracing(t => t.AddSource(activitySources))
    .WithMetrics(m => m.AddMeter(meterNames));

// Bridge ILogger into the OTel pipeline so logs carry TraceId/SpanId
builder.Logging.AddOpenTelemetry(o => o.IncludeFormattedMessage = true);
```

`UseMicrosoftOpenTelemetry` comes from the [Microsoft OpenTelemetry distro](https://github.com/microsoft/opentelemetry-distro-dotnet). It handles auto-instrumentation for ASP.NET Core, `HttpClient`, and the Azure SDK, and provides the `ExportTarget` flags enum for combining exporters.

## Seeing It in Action — Five-Minute Local Setup

The fastest way to explore the full observability stack locally is the [Grafana LGTM container](https://github.com/grafana/docker-otel-lgtm) — a single Docker image that bundles Tempo (traces), Mimir (metrics), Loki (logs), and a Grafana frontend.

```bash
# 1. Start the all-in-one observability backend
docker run --rm -d --name lgtm \
  -p 3000:3000 -p 4317:4317 -p 4318:4318 \
  grafana/otel-lgtm

# 2. Point your bot at it
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_SERVICE_NAME=my-teams-bot
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=local,service.version=dev"

dotnet run
```

Then open [http://localhost:3000](http://localhost:3000) (`admin` / `admin`) and send a message to your bot. Within seconds you'll see:

- **Tempo** — the span tree for each turn, with timing for every middleware and handler call
- **Mimir** — the `teams_turn_duration_milliseconds_bucket` histogram and activity counters
- **Loki** — every log record from your handlers, each tagged with `TraceId` and `SpanId`

Click the `TraceId` link in a Loki log line to jump straight to the matching Tempo trace. Click a slow span in Tempo and use the "Logs for this span" button to see what your handler logged.

## Exporting to Production Backends

For production, switch from `ExportTarget.Console` to your real backend. The SDK supports OTLP (any compatible collector), Azure Monitor / Application Insights, and the Microsoft 365 observability platform:

```csharp
// Azure Monitor — reads APPLICATIONINSIGHTS_CONNECTION_STRING
o.Exporters = ExportTarget.Otlp | ExportTarget.AzureMonitor;
```

All three exporters can be combined — useful when you want Application Insights for alerting and a Grafana-based dashboard at the same time.

## The ObservabilityBot Sample

The [ObservabilityBot sample](https://github.com/microsoft/teams.net/tree/main/core/samples/ObservabilityBot) in the teams.net repository is a minimal but complete reference that shows how all of this fits together. It wires the Teams SDK to the Microsoft OpenTelemetry distro, adds an AI chat client with its own OTel source, and connects to an MCP client — giving you traces that span bot handling, LLM calls, and tool invocations in a single view.

For the reference docs on every section, metric name, and configuration option, see the [OpenTelemetry in-depth guide](/teams-sdk/csharp/in-depth-guides/observability/open-telemetry).
