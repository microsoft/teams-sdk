---
slug: announcing-teams-sdk-dotnet-2-1-preview
title: "Announcing Teams SDK for .NET 2.1 Preview"
date: 2026-05-19
authors:
  - name: Ricardo Minguez (Rido)
    title: Microsoft
    url: https://avatars.githubusercontent.com/u/14916339
tags: [teams-sdk, dotnet, preview, announcement]
description: Teams SDK for .NET 2.1 preview lets your bot run as an AI teammate in Microsoft 365 — with native ASP.NET Core integration, redesigned SSO, and agentic identity support.
---

Build [Agent 365](https://learn.microsoft.com/microsoft-agent-365/) solutions with the Teams SDK for .NET 2.1 preview, available today:

```bash
dotnet add package Microsoft.Teams.Apps --prerelease
```

Here's what changes for your Teams bot apps:

- **[Your app is just an ASP.NET Core app.](#native-aspnet-core-integration)** Standard DI, `ILogger`, and `IConfiguration` throughout, with typed activity handlers and a rich context object. A working bot is about 15 lines.
- **[Run your bot as an AI teammate with its own identity.](#agentic-identity)** The SDK supports agentic identities from Agent 365, so your bot can act as the AI teammate with their permissions, no extra plumbing needed.
- **[Migrate your existing Bot Framework v4 bot in two lines.](#migration-from-bot-framework-v4)** A compatibility package runs your existing `IBot` implementation on the new infrastructure unchanged, so you can adopt all new features at your own pace, including Agentic scenarios.

<!-- truncate -->

> **Coming from Teams SDK 2.0?** Most of the API surface is unchanged — `context.Send()`, `context.Reply()`, `context.Log`, handler registration, and `App.Builder()` all work as before. See [what changed](#migration-from-teams-sdk-20) for the short list of changes.

## Native ASP.NET Core Integration

The 2.1 preview is built around the patterns .NET developers already know. All services register through `AddTeamsBotApplication()` — **Dependency injection**, **Logging**, and **Configuration** are all standard. Incoming and outgoing authentication is built on MSAL, with support for client secrets, managed identities, and federated identity credentials.

Here's a minimal bot that handles messages in about 15 lines:

```csharp
using Microsoft.Teams.Apps;

WebApplicationBuilder builder = WebApplication.CreateSlimBuilder(args);
builder.Services.AddTeamsBotApplication();
WebApplication app = builder.Build();

TeamsBotApplication teams = app.UseTeamsBotApplication();

teams.OnMessage(async (context, cancellationToken) =>
{
    await context.SendActivityAsync($"You said: {context.Activity.Text}", cancellationToken);
});

app.Run();
```

`AddTeamsBotApplication()` registers everything the SDK needs into DI. `UseTeamsBotApplication()` wires it into the ASP.NET Core pipeline. From there, you register handlers for the activity types you care about.

Authentication is configured through the standard `AzureAd` section in `appsettings.json`:

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "your-tenant-id",
    "ClientId": "your-client-id",
    "ClientCredentials": [
      {
        "SourceType": "ClientSecret",
        "ClientSecret": "your-client-secret"
      }
    ]
  }
}
```

The SDK auto-detects the credential type based on which fields are present — client secrets, system-assigned managed identities, user-assigned managed identities, and federated identity credentials all work from this same config block with no code changes between them.

To run the application listening on a given port:

```bash
dotnet run -- --urls http://*:3978
```

## Agentic Identity

With [Agent 365](https://learn.microsoft.com/microsoft-agent-365/), your bot can run as an **AI teammate** — a first-class identity in Microsoft 365 with its own mailbox, Teams presence, directory entry, and manager relationship. People @mention it, email it, and invite it to meetings, just like a human colleague.

This changes how your bot interacts with APIs. A traditional bot calls APIs with its own app permissions. An AI teammate can call APIs with its own identity — scoped to what *they* can access, with actions attributed to them in audit logs.

<svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two scenarios: bot acts as itself versus bot acts as AI teammate on behalf of a user" style={{maxWidth: '100%', height: 'auto', fontFamily: 'system-ui, -apple-system, sans-serif'}}>
  <defs>
    <marker id="arr-scenarios" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <text x="30" y="28" fill="currentColor" fontSize="13" fontWeight="600">Traditional bot — acts as itself</text>
  <text x="30" y="208" fill="currentColor" fontSize="13" fontWeight="600">AI teammate — acts with its own identity</text>

  <g fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="30" y="64" width="140" height="48" rx="6"/>
    <rect x="290" y="64" width="140" height="48" rx="6"/>
    <rect x="550" y="64" width="140" height="48" rx="6"/>
    <line x1="170" y1="88" x2="282" y2="88" markerEnd="url(#arr-scenarios)"/>
    <line x1="430" y1="88" x2="542" y2="88" markerEnd="url(#arr-scenarios)"/>

    <rect x="30" y="240" width="140" height="48" rx="6"/>
    <rect x="290" y="252" width="140" height="48" rx="6"/>
    <rect x="550" y="252" width="140" height="48" rx="6"/>
    <line x1="170" y1="276" x2="282" y2="276" markerEnd="url(#arr-scenarios)"/>
    <line x1="430" y1="276" x2="542" y2="276" markerEnd="url(#arr-scenarios)"/>
  </g>

  <g fill="currentColor" fontSize="14" textAnchor="middle">
    <text x="100" y="93">Human user</text>
    <text x="360" y="93">Your bot</text>
    <text x="360" y="106" fontSize="12" opacity="0.7">as an app</text>
    <text x="620" y="93">Microsoft Graph</text>
    <text x="100" y="268">Human user</text>
    <text x="360" y="281">Your bot</text>
    <text x="360" y="296" fontSize="12" opacity="0.7">as AI teammate</text>
    <text x="620" y="281">Microsoft Graph</text>
  </g>

  <g fill="currentColor" fontSize="11" opacity="0.75" textAnchor="middle">
    <text x="226" y="80">sends message</text>
    <text x="486" y="80">app permissions</text>
    <text x="226" y="258">sends message</text>
    <text x="486" y="258">AI Teammate's </text>
    <text x="486" y="270" fontSize="10">permissions</text>
  </g>
</svg>

If you need to check whether you're in an agentic context — for logging or conditional logic — pull the identity off the activity `Recipient` object:

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    var agenticIdentity = context.Activity.Recipient?.GetAgenticIdentity();

    if (agenticIdentity is not null)
    {
        context.Log.Info(
            $"Acting on behalf of user {agenticIdentity.AgenticUserId} " +
            $"via app {agenticIdentity.AgenticAppId}");
    }

    // context.Api calls automatically use the right permissions
    // whether or not an agentic identity is present
    await context.SendActivityAsync(
        $"You said: {context.Activity.Text}",
        cancellationToken);
});
```

To get started with agentic scenarios, configure your [app registration for Agent 365](https://learn.microsoft.com/microsoft-agent-365/developer/custom-client-app-registration). For the deeper conceptual background, see the [Entra Agent ID documentation](https://learn.microsoft.com/entra/agent-id/how-to-plan-agent-identity-architecture).


## Migration from Bot Framework v4

If you have an existing Bot Framework v4 bot, you don't need to rewrite it. The `Microsoft.Teams.Apps.BotBuilder` package provides a compatibility layer that lets your current `IBot` implementation run on the new SDK infrastructure with minimal changes.

Your bot's business logic stays exactly the same — `ConversationState`, `UserState`, `Dialogs`, `WaterfallDialogs`, `SSO`, and `Middleware` all work as-is. Only the hosting and infrastructure layer changes.

### Drop-in migration

#### Replace NuGet packages

```xml
<!-- Remove this -->
<PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.22.3" />

<!-- Add this -->
<PackageReference Include="Microsoft.Teams.Apps.BotBuilder" Version="1.0.*" />
```

#### Update your startup code

Your `IBot` implementation stays untouched. Only the service registration changes:

**Before (Bot Framework v4):**

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSingleton<IBotFrameworkHttpAdapter, AdapterWithErrorHandler>();
builder.Services.AddTransient<IBot, EchoBot>();

var app = builder.Build();
app.MapControllers();
app.Run();
```

**After (Teams SDK 2.1 compatibility):**

```csharp
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.Teams.Apps.BotBuilder;

var builder = WebApplication.CreateBuilder(args);

builder.AddTeamsBotFrameworkHttpAdapter();
builder.Services.AddTransient<IBot, EchoBot>();

var app = builder.Build();

app.MapPost("/api/messages", async (IBotFrameworkHttpAdapter adapter, IBot bot, HttpRequest request, HttpResponse response, CancellationToken ct)
    => await adapter.ProcessAsync(request, response, bot, ct));

app.Run();
```

#### Update your configuration

Replace the flat Bot Framework keys with the standard `AzureAd` section:

**Before:**

```json
{
  "MicrosoftAppId": "your-client-id",
  "MicrosoftAppPassword": "your-client-secret",
  "MicrosoftAppTenantId": "your-tenant-id"
}
```

**After:**

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "your-tenant-id",
    "ClientId": "your-client-id",
    "ClientCredentials": [
      {
        "SourceType": "ClientSecret",
        "ClientSecret": "your-client-secret"
      }
    ]
  }
}
```

That's it. Run `dotnet run` and your bot responds to the same messages on the same endpoint.

### Key API differences

| Bot Framework v4 | Teams SDK 2.1 | Notes |
|---|---|---|
| `turnContext.SendActivityAsync(MessageFactory.Text("hi"))` | `context.Send("hi", ct)` | Convenience method on context |
| `ITurnContext<IMessageActivity>` | `Context<MessageActivity>` | Strongly typed context |
| `MessageFactory.Text("hi")` | `new MessageActivity("hi")` | Direct construction |
| `TeamsInfo` | replace with `TeamsApiClient` |
| `turnContext.Activity.CreateReply("text")` | `context.Reply("text", ct)` | Auto-quotes the inbound message |

## Migration from Teams SDK 2.0

Most of your code works unchanged. Here's the short list of changes.

### API changes

**`context.Ref` removed** — Use `context.Activity.Conversation` directly instead of `context.Ref.Conversation`.

**OAuth events moved to per-flow callbacks:**

```csharp
// Old
teams.OnSignIn(async (_, @event, cancellationToken) => { ... });

// New
var flow = teams.GetOAuthFlow("graph");
flow.OnSignInComplete(async (context, token, cancellationToken) => { ... });
```

**Namespace changes** — Activity types moved from `Microsoft.Teams.Api.Activities` to `Microsoft.Teams.Apps.Schema`. Member access (`.Text`, `.From`, `.Conversation`) stays the same — only `using` statements need updating.

### Packages no longer available

The 2.1 preview consolidates into three packages. The following 2.0 packages have no equivalent and must be replaced:

| Removed package | Alternative |
|---|---|
| `Microsoft.Teams.AI` / `Microsoft.Teams.AI.Models.OpenAI` | `Microsoft.Extensions.AI`|
| `Microsoft.Teams.Cards` | Use `TeamsActivityBuilder` with `AddAdaptiveCardAttachment()` |
| `Microsoft.Teams.Extensions.Graph` | `Microsoft.Graph` |
| `Microsoft.Teams.Apps.Testing` | Use standard .NET DI mocking |
| `Microsoft.Teams.Common` (logging, HTTP) | Use `Microsoft.Extensions.Logging` and `HttpClient` via DI |
| `Microsoft.Teams.Plugins.*` | Plugin architecture removed — use standard ASP.NET Core middleware and DI |

For the full list of API changes, see the [Migration Guide](https://github.com/microsoft/teams.net/blob/main/core/docs/MigrationGuide.md).

## What You Can Build Today

The preview supports the following scenarios:

- **Messages** — handling, regex routing, updates, deletes, reactions
- **Adaptive Cards** — action submissions with typed value access
- **Task modules** — fetch and submit dialogs
- **Message extensions** — search queries
- **OAuth and SSO** — per-flow sign-in with automatic SSO
- **Conversation events** — members added/removed, install/uninstall
- **Streaming** — progressive message updates with rate limiting
- **Proactive messaging** — send messages and replies outside of a turn
- **Agentic identity** — act on behalf of users with their permissions
- **Targeted messages** — messages visible only to a specific user


## Roadmap

We're actively working on completing the integration with [Agent 365](https://learn.microsoft.com/microsoft-agent-365/) for the GA release. This includes full support for agentic identity flows, lifecycle events, and alignment with the broader Agent 365 ecosystem such as OpenTelemetry integration for enhanced observability.

We'd love your feedback on the preview. File issues and feature requests on the [GitHub repository](https://github.com/microsoft/teams-sdk).
