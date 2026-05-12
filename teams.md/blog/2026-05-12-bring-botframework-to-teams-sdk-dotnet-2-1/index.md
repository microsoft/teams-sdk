---
slug: bring-botframework-to-teams-sdk-dotnet-2-1
title: "Bring Your Bot Framework .NET Projects to Teams SDK 2.1 Preview"
date: 2026-05-12
authors:
  - name: Author Name
    title: Ricardo Minguez (Rido)
    url: https://github.com/author
    image_url: https://github.com/author.png
tags: [teams-sdk, dotnet, migration, bot-framework]
description: Migrate your existing Bot Framework v4 bots to Teams SDK for .NET 2.1 with a drop-in compatibility layer, then convert to native handlers at your own pace.
---

If you have an existing Bot Framework v4 bot, you don't need to rewrite it. [Teams SDK for .NET 2.1 preview](/blog/announcing-teams-sdk-dotnet-2-1-preview) includes a compatibility layer that lets your current `IBot` implementation run on the new SDK infrastructure with minimal changes. Once you're running, you can convert to native handlers at your own pace.

<!-- truncate -->

## What the Compatibility Layer Does

The `Microsoft.Teams.Apps.BotBuilder` package provides a bridge between your existing Bot Framework v4 code and the new Teams SDK:

- **`TeamsBotFrameworkHttpAdapter`** implements `IBotFrameworkHttpAdapter`, so your existing `IBot` works unchanged
- **Under the hood**, the Core SDK handles authentication (MSAL), connections, and the activity pipeline
- **Wrapper clients** (`CompatConnectorClient`, `CompatUserTokenClient`) bridge Bot Framework interfaces to the new infrastructure

Your bot's business logic stays exactly the same. Only the hosting and infrastructure layer changes. All Bot Framework v4 features are supported through the compatibility layer, including `ConversationState`, `UserState`, `Dialogs`, `WaterfallDialogs`, and middleware — anything that runs on top of `IBotFrameworkHttpAdapter` and `IBot` works as-is.

## Step 1: Drop-In Migration

This gets your existing bot running on the new SDK in minutes.

### Replace NuGet packages

Remove your existing Bot Framework packages and add the compatibility layer:

```xml
<!-- Remove these -->
<PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="..." />

<!-- Add this -->
<PackageReference Include="Microsoft.Teams.Apps.BotBuilder" Version="2.1.0-preview.*" />
```

> **Note:** `Microsoft.Teams.Apps.BotBuilder` references Bot Framework SDK v4.22.3. If your bot depends on a specific Bot Framework version, verify compatibility before upgrading.

### Update your startup code

The only code change is how you register services. Your `IBot` implementation stays untouched.

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

// One line replaces the adapter registration
builder.AddTeamsBotFrameworkHttpAdapter();
builder.Services.AddTransient<IBot, EchoBot>();

var app = builder.Build();

// Wire up the messages endpoint
app.MapPost("/api/messages", async (HttpContext context, IBotFrameworkHttpAdapter adapter, IBot bot) =>
{
    await adapter.ProcessAsync(context.Request, context.Response, bot, context.RequestAborted);
});

app.Run();
```

### Update your configuration

Bot Framework v4 uses flat configuration keys for authentication. The new SDK uses the standard `AzureAd` section from Microsoft Identity Web.

**Before (`appsettings.json` or environment variables):**

```json
{
  "MicrosoftAppId": "your-client-id",
  "MicrosoftAppPassword": "your-client-secret",
  "MicrosoftAppTenantId": "your-tenant-id"
}
```

**After (`appsettings.json`):**

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

The `AzureAd` section is the standard format used across all Microsoft Identity Web libraries. Moving to it unlocks support for managed identities and federated credentials without code changes — see the [announcement post](/blog/announcing-teams-sdk-dotnet-2-1-preview#msal-authentication) for all supported credential types.

> **Note:** The SDK auto-detects configuration format. During migration, the legacy `MicrosoftAppId` / `MicrosoftAppPassword` keys will still work, but we recommend moving to the `AzureAd` section to take advantage of modern credential types.

That's it. Your `EchoBot` class, your `OnMessageActivityAsync`, your `OnTurnAsync` — all unchanged. The new SDK handles authentication, token validation, and the activity pipeline under the hood.

### Run and verify

```bash
dotnet run
```

Your bot starts on the same endpoint and responds to the same messages. The difference is invisible to users — but under the hood you're running on MSAL authentication, `System.Text.Json` serialization, and the new layered architecture.

## Step 2: Convert to Native Handlers

Once your bot is running on the compatibility layer, you can incrementally convert to native Teams SDK handlers. This is optional — the compatibility layer is fully supported — but native handlers give you a better developer experience.

### Replace your IBot with TeamsBotApplication

Instead of a class that inherits from `ActivityHandler` and overrides methods, you register typed handlers on `TeamsBotApplication`:

**Before (Bot Framework v4 `ActivityHandler`):**

```csharp
public class EchoBot : ActivityHandler
{
    protected override async Task OnMessageActivityAsync(
        ITurnContext<IMessageActivity> turnContext,
        CancellationToken cancellationToken)
    {
        var replyText = $"Echo: {turnContext.Activity.Text}";
        await turnContext.SendActivityAsync(
            MessageFactory.Text(replyText), cancellationToken);
    }

    protected override async Task OnMembersAddedAsync(
        IList<ChannelAccount> membersAdded,
        ITurnContext<IConversationUpdateActivity> turnContext,
        CancellationToken cancellationToken)
    {
        foreach (var member in membersAdded)
        {
            await turnContext.SendActivityAsync(
                MessageFactory.Text($"Welcome {member.Name}!"), cancellationToken);
        }
    }
}
```

**After (Teams SDK 2.1 native handlers):**

```csharp
using Microsoft.Teams.Apps;

var builder = WebApplication.CreateSlimBuilder(args);
builder.Services.AddTeamsBotApplication();
var app = builder.Build();

var teams = app.UseTeamsBotApplication();

teams.OnMessage(async (context, cancellationToken) =>
{
    await context.SendActivityAsync($"Echo: {context.Activity.Text}", cancellationToken);
});

teams.OnMembersAdded(async (context, cancellationToken) =>
{
    foreach (var member in context.Activity.MembersAdded ?? [])
    {
        await context.SendActivityAsync($"Welcome {member.Name}!", cancellationToken);
    }
});

app.Run();
```

No base class to inherit from. No method overrides to remember. Each handler is a standalone function with a typed activity and rich context.

### Convert invoke handlers

Bot Framework v4 invoke handlers map directly to named Teams SDK handlers:

**Before:**

```csharp
protected override async Task<InvokeResponse> OnAdaptiveCardActionExecuteAsync(
    ITurnContext<IInvokeActivity> turnContext,
    CancellationToken cancellationToken)
{
    var data = turnContext.Activity.Value;
    // process...
    return CreateInvokeResponse(/* ... */);
}

protected override async Task<TaskModuleResponse> OnTeamsTaskModuleFetchAsync(
    ITurnContext<IInvokeActivity> turnContext,
    TaskModuleRequest taskModuleRequest,
    CancellationToken cancellationToken)
{
    // return task module...
}
```

**After:**

```csharp
teams.OnAdaptiveCardAction(async (context, cancellationToken) =>
{
    var data = context.Activity.Value?.Action?.Data;
    // process...
    return AdaptiveCardResponse.CreateMessageResponse("Done!");
});

teams.OnTaskFetch(async (context, cancellationToken) =>
{
    return TaskModuleResponse.CreateBuilder()
        .WithType(TaskModuleResponseType.Continue)
        .WithTitle("My Task Module")
        .WithCard(myCard)
        .Build();
});
```

### Key API differences

| Bot Framework v4 | Teams SDK 2.1 | Notes |
|---|---|---|
| `turnContext.SendActivityAsync(MessageFactory.Text("hi"))` | `context.SendActivityAsync("hi", ct)` | Convenience method on context |
| `turnContext.Activity.Text` | `context.Activity.Text` | Same property, typed activity |
| `ITurnContext<IMessageActivity>` | `Context<MessageActivity>` | Strongly typed context |
| `turnContext.Activity.From.Name` | `context.Activity.From?.Name` | Teams-typed account |
| `MessageFactory.Text("hi")` | `new MessageActivity("hi")` | Direct construction |
| `TeamsInfo.GetMembersAsync(turnContext)` | `context.Api.Conversations.Members.GetAsync(convId, ct)` | Scoped API client |
| `turnContext.Activity.CreateReply("text")` | `context.Reply("text", ct)` | Threaded reply |

### Convert OAuth flows

**Before:**

```csharp
protected override async Task OnTokenResponseEventAsync(
    ITurnContext<IEventActivity> turnContext,
    CancellationToken cancellationToken)
{
    var token = turnContext.Activity.Value as TokenResponse;
    // use token...
}
```

**After:**

```csharp
var flow = teams.GetOAuthFlow("graph");
flow.OnSignInComplete(async (context, tokenResponse, cancellationToken) =>
{
    // use tokenResponse.Token — passed directly as a parameter
});
flow.OnSignInFailure(async (context, failure, cancellationToken) =>
{
    await context.SendActivityAsync("Sign-in failed. Please try again.", cancellationToken);
});
```

OAuth flows are now per-connection, which is cleaner when your bot uses multiple OAuth connections.

## What You Gain

Even with the drop-in compatibility layer, your existing bot immediately benefits from the new SDK infrastructure. But completing the migration to native handlers unlocks the full developer experience:

- **Typed activity routing** — Compile-time safety instead of runtime activity type checks. Regex-based message routing built in.
- **Rich context object** — `context.SendActivityAsync()`, `context.Reply()`, `context.SendTypingActivityAsync()`, and `context.Log` replace verbose `turnContext.SendActivityAsync(MessageFactory.Text(...))` calls.
- **Scoped API clients** — `context.Api` provides Teams-specific APIs (conversations, members, meetings, teams) scoped to the current request, instead of static `TeamsInfo` helper methods.
- **Modern serialization** — `System.Text.Json` with source generation for AOT support and faster performance.
- **Agentic identity support** — Your bot can act on behalf of users with user-delegated tokens. The SDK handles identity extraction and token acquisition transparently — existing bots running on the compatibility layer already benefit from the underlying MSAL infrastructure. See [Start using Agentic Identities with Teams SDK 2.1](/blog/bring-agentic-identities-to-teams-sdk-dotnet-2-1) for a hands-on tutorial.
- **Reactions API** — Add and remove message reactions programmatically via `context.Api.Conversations.Reactions`, a capability not available in Bot Framework v4.
- **Targeted messages** — Send messages visible only to a specific user in a conversation, useful for confirmations, errors, or sensitive content that shouldn't be shared with the full group.

## Get Started

Install the compatibility package to start the migration:

```bash
dotnet add package Microsoft.Teams.Apps.BotBuilder --prerelease
```

Or go straight to native handlers:

```bash
dotnet add package Microsoft.Teams.Apps --prerelease
```

For the full list of API changes, see the [Migration Guide](https://github.com/microsoft/teams-sdk/blob/main/dotnet/core/docs/MigrationGuide.md). Explore the [samples](https://github.com/microsoft/teams-sdk/tree/main/dotnet/samples) for complete working examples.

**More in this series:**
- [Announcing Teams SDK for .NET 2.1 preview](/blog/announcing-teams-sdk-dotnet-2-1-preview)
- [Start using Agentic Identities with Teams SDK 2.1 preview](/blog/bring-agentic-identities-to-teams-sdk-dotnet-2-1)
