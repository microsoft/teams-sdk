---
slug: announcing-teams-sdk-dotnet-2-1
title: "Teams SDK for .NET 2.1 is now Generally Available"
date: 2026-08-03
authors:
  - name: Mehak Bindra
    title: Microsoft
    url: https://github.com/mehakbindra
    image_url: https://github.com/mehakbindra.png
tags: [teams-sdk, dotnet, announcement, ga]
description: Teams SDK 2.1 is now generally available, bringing native ASP.NET Core integration, MSAL-native auth, agentic identity support, built-in state management, OpenTelemetry instrumentation, and a redesigned OAuth model.
---

Today we're announcing the general availability (GA) of Teams SDK 2.1 for .Net. This release brings the full ASP.NET Core ecosystem to your Teams bot: DI, configuration, logging, middleware, and MSAL-native auth all work exactly as they do in any other .NET service. On top of that foundation, 2.1 ships agentic identity support, built-in state management, OpenTelemetry instrumentation, and a redesigned multi-flow OAuth model.

Install to get started:

```bash
dotnet add package Microsoft.Teams.Apps
```
If you're building on an existing app, see the [migration guide](/csharp/migrations/v2-dotnet) to plan your upgrade.

<!-- truncate -->

## ASP.NET Core is now the foundation

In 2.0, the SDK owned too much: a plugin architecture, a proprietary server lifecycle, a custom event bus, a separate dependency system, and full ownership of hosting, configuration, logging, HTTP, and storage. This meant every team had to work around the SDK instead of with the .NET ecosystem they already knew. In 2.1, the SDK steps back. It handles the Teams-specific parts (inbound activity validation, activity dispatch,  auth via MSAL and outbound message builders and clients) and hands everything else back to ASP.NET Core. A basic Teams agent is now a small ASP.NET Core application with a message handler — services, configuration, logging, middleware, and authorization all work exactly as they do in any other .NET app.

Handlers in 2.1 are typed, readable, and composable, with regex routing for messages and a rich `context` object that gives you the typed activity, DI-resolved services, logging, and outbound helpers all in one place.

For the full overview, see the [migration guide](/csharp/migrations/v2-dotnet).

## What's shipping in 2.1

### Agentic identity

Using the Teams SDK, you can bring an [Agent 365](https://learn.microsoft.com/microsoft-agent-365/) agentic identity to Teams as an **AI teammate**, a first-class Microsoft 365 entity with its own mailbox, Teams presence, and directory entry. Unlike a traditional bot, an AI teammate calls APIs with its own identity, not app permissions. Actions are attributed to it in audit logs, and it's scoped to what it can access.

The SDK handles the token resolution automatically per turn. You don't change how you call APIs; you just optionally check whether the turn is agentic using `context.Activity.Recipient?.GetAgenticIdentity()`.

See the [Agentic Identity guide](/csharp/in-depth-guides/agentic-identity).

### Multi-flow OAuth

In 2.0, OAuth was a single pair of `OnSignIn`/`OnSignInFailure` events. Multiple connections meant branching inside a shared callback. In 2.1, each connection is a named flow registered at startup with its own lifecycle: sign-in trigger, success callback, and failure callback are all scoped per connection. Multiple flows stay isolated and independently testable.
See the [User Authentication guide](/csharp/in-depth-guides/user-authentication).

### Built-in state

2.0 had no state model. 2.1 ships `ConversationState` and `UserState` out of the box via `options.UseState()`, backed by `IDistributedCache`. It defaults to in-memory for local development. To go distributed (Redis, SQL, Azure Cache), you register a cache provider before calling `UseState()`, and your handler code doesn't change at all.

See the [State Management guide](/csharp/in-depth-guides/state).

### OpenTelemetry instrumentation

The SDK now instruments its pipeline through standard .NET primitives (`ActivitySource`, `Meter`, and `ILogger`), following the .NET library instrumentation model: the SDK produces telemetry, your app chooses where it goes. Route to Azure Monitor, an OTLP collector, or both.

See the [OpenTelemetry guide](/csharp/in-depth-guides/observability/opentelemetry).

## Integrating with your stack

### Pairing Teams SDK with your agent framework

The Teams SDK's built-in AI helpers (`ChatPrompt`, `OpenAIChatModel`, MCP and A2A plugins) are removed in 2.1. The SDK's role is to be the best Teams runtime layer, not an agent framework. Dedicated frameworks (OpenAI SDK, Microsoft Agent Framework, LangChain, Foundry) handle the AI loop better than a bundled helper can. The [AI libraries to agent frameworks post](/blog/ai-libraries-to-agent-frameworks) covers the rationale and how to migrate.

### Bot Framework v4 compatibility

If you have an existing Bot Framework v4 bot, you can run it on the new SDK infrastructure without rewriting your handlers. Install the compatibility package and pass your existing `IBot` implementation: two lines, and your bot works unchanged.

See the [BotBuilder migration guide](/csharp/migrations/botbuilder).

## Get started

- **[Follow the quick start guide](/csharp/getting-started/quickstart):** Create a new Teams agent in seconds.
- **[Explore an example](https://github.com/microsoft/teams.net/tree/main/core/samples):** Dig deeper into the code with hands-on samples.
- **[Join the community](https://github.com/microsoft/teams.net):** Share your ideas, ask questions, and report issues in the Teams SDK repo.
- Coming from 2.0: [Migration guide](/csharp/migrations/v2-dotnet)
- Coming from Bot Framework v4: [BotBuilder compatibility](/csharp/migrations/botbuilder)
