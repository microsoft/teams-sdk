---
slug: bring-agentic-identities-to-teams-sdk-dotnet-2-1
title: "Bring Agentic Identities to your Agents on Teams with the Teams SDK .NET 2.1"
date: 2026-05-12
authors:
  - name: Ricardo Minguez (Rido)
    title: Microsoft
    url: https://github.com/author
    image_url: https://github.com/author.png
tags: [teams-sdk, dotnet, agentic-identity, agents-365]
description: Build bots that act on behalf of users with agentic identities in Teams SDK for .NET 2.1 preview — user-delegated tokens with zero manual plumbing.
---

Your bot can call Microsoft Graph and Teams APIs as itself — or as someone else entirely. When a message arrives from an AI teammate or in a user-delegated context, [Teams SDK for .NET 2.1 preview](/blog/announcing-teams-sdk-dotnet-2-1-preview) gives your handlers the identity bits they need to act *as that user*, with that user's permissions. The SDK reads the identity off the incoming activity and acquires the right token through MSAL transparently — your handler code looks the same either way.

This post is about that second case: when your bot needs to act on behalf of someone else rather than as itself.

<!-- truncate -->

## Two scenarios your bot needs to handle

Microsoft's [Agent 365](https://learn.microsoft.com/agents-365) program distinguishes two kinds of agents your bot will interact with:

| Agent type | Identity | Example |
|---|---|---|
| **Agent** | Acts on behalf of a signed-in user (delegated), or as the app itself (application). | A help-desk bot a user installs in their Teams client. |
| **AI teammate** | Has its own user identity in Microsoft 365 — own mailbox, Teams presence, directory entry, manager relationship. | An onboarding agent named *Pat* who lives in the directory. People @mention Pat, email Pat, and invite Pat to meetings. |

For your bot, the question on every incoming message is: *who is on the other end of this conversation, and whose permissions should I use to do the work?*

<svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two scenarios: bot acts as itself versus bot acts on behalf of someone else" style={{maxWidth: '100%', height: 'auto', fontFamily: 'system-ui, -apple-system, sans-serif'}}>
  <defs>
    <marker id="arr-scenarios" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <text x="30" y="28" fill="currentColor" fontSize="13" fontWeight="600">Scenario A — bot acts as itself</text>
  <text x="30" y="208" fill="currentColor" fontSize="13" fontWeight="600">Scenario B — bot acts on behalf of someone else</text>

  <g fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="30" y="64" width="140" height="48" rx="6"/>
    <rect x="290" y="64" width="140" height="48" rx="6"/>
    <rect x="550" y="64" width="140" height="48" rx="6"/>
    <line x1="170" y1="88" x2="282" y2="88" markerEnd="url(#arr-scenarios)"/>
    <line x1="430" y1="88" x2="542" y2="88" markerEnd="url(#arr-scenarios)"/>

    <rect x="30" y="240" width="140" height="64" rx="6"/>
    <rect x="290" y="252" width="140" height="48" rx="6"/>
    <rect x="550" y="252" width="140" height="48" rx="6"/>
    <line x1="170" y1="276" x2="282" y2="276" markerEnd="url(#arr-scenarios)"/>
    <line x1="430" y1="276" x2="542" y2="276" markerEnd="url(#arr-scenarios)"/>
  </g>

  <g fill="currentColor" fontSize="14" textAnchor="middle">
    <text x="100" y="93">Human user</text>
    <text x="360" y="93">Your bot</text>
    <text x="620" y="93">Microsoft Graph</text>
    <text x="100" y="268">AI teammate</text>
    <text x="100" y="288" fontSize="12" opacity="0.7">or delegating user</text>
    <text x="360" y="281">Your bot</text>
    <text x="620" y="281">Microsoft Graph</text>
  </g>

  <g fill="currentColor" fontSize="11" opacity="0.75" textAnchor="middle">
    <text x="226" y="80">sends message</text>
    <text x="486" y="80">app-only token</text>
    <text x="226" y="258">sends message</text>
    <text x="226" y="270" fontSize="10">with agentic identity</text>
    <text x="486" y="258">user-delegated token</text>
    <text x="486" y="270" fontSize="10">scoped to the teammate</text>
  </g>
</svg>

In **Scenario A**, your bot calls APIs with its own app-only token — the tenant-wide consent your bot was granted at install time. Audit logs attribute every action to the bot.

In **Scenario B**, your bot calls APIs with a token that represents the user on the other side of the conversation — scoped to what *they* can access. If Pat doesn't have access to a SharePoint site, the call fails, even when your bot does. Actions show up as Pat's in audit logs.

The SDK recognizes Scenario B by reading three fields on `activity.From`:

| Field | Purpose |
|---|---|
| `agenticAppId` | The app ID of the agent acting on behalf of the user |
| `agenticUserId` | The user whose identity the agent is delegating |
| `agenticAppBlueprintId` | The blueprint ID for the agentic app configuration |

When any of these are set, the SDK switches to user-delegated token acquisition automatically. For the deeper conceptual background, see the [Agents 365 identity documentation](https://learn.microsoft.com/agents-365/identity).

## How the identity flows through the SDK

You don't extract the identity, look up a token, or thread anything through to MSAL — the SDK does all of that. From the moment an activity arrives to the moment your `context.Api.*` call leaves the wire:

<svg viewBox="0 0 720 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="How agentic identity flows through the SDK" style={{maxWidth: '100%', height: 'auto', fontFamily: 'system-ui, -apple-system, sans-serif'}}>
  <defs>
    <marker id="arr-flow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <g fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="20" y="30" width="200" height="130" rx="6"/>
    <rect x="260" y="30" width="200" height="130" rx="6"/>
    <rect x="500" y="30" width="200" height="130" rx="6"/>
    <line x1="220" y1="95" x2="252" y2="95" markerEnd="url(#arr-flow)"/>
    <line x1="460" y1="95" x2="492" y2="95" markerEnd="url(#arr-flow)"/>
  </g>

  <g fill="currentColor" fontSize="14" fontWeight="600" textAnchor="middle">
    <text x="120" y="55">activity.From</text>
    <text x="360" y="55">SDK</text>
    <text x="600" y="55">context.Api.*</text>
  </g>

  <g fill="currentColor" fontSize="11" opacity="0.65" textAnchor="middle">
    <text x="120" y="72">(from incoming activity)</text>
    <text x="360" y="72">(no code from you)</text>
    <text x="600" y="72">(outbound call)</text>
  </g>

  <g fontSize="11" fill="currentColor" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
    <text x="35" y="100">agenticAppId</text>
    <text x="35" y="118">agenticUserId</text>
    <text x="35" y="136">agenticAppBlueprintId</text>

    <text x="275" y="100">AgenticIdentity</text>
    <text x="275" y="118">  .FromAccount</text>
    <text x="275" y="136">MSAL token cache</text>

    <text x="515" y="100">acts as</text>
    <text x="515" y="118">  agenticUserId</text>
    <text x="515" y="136">(delegated token)</text>
  </g>
</svg>

Every API client in the SDK — `ActivityClient`, `ReactionClient`, `MemberClient`, `MeetingClient`, `TeamClient` — accepts an `AgenticIdentity` and threads it through to MSAL. When you call `context.Api` from a handler, the identity is already attached.

If you ever need the raw bits — for logging, custom checks, or out-of-band API calls — pull them off the activity directly:

```csharp
AgenticIdentity? identity = activity.From?.GetAgenticIdentity();

// identity.AgenticAppId           → "app-id-123"
// identity.AgenticUserId          → "user-id-456"
// identity.AgenticAppBlueprintId  → "blueprint-id-789"
```

(`GetAgenticIdentity()` is the extension-method form of `AgenticIdentity.FromAccount(activity.From)`. Either works; the extension method reads more naturally inside a handler.)

## Tutorial: Build a Bot That Acts on Behalf of an Agentic User

Let's build a bot that receives a message in an agentic context and performs actions using the user's identity.

### Prerequisites

Before writing code, you need:

1. **An app registration** configured for agentic scenarios. See the [Agents 365 setup guide](https://learn.microsoft.com/agents-365/setup) for the required permissions and configuration.
2. **MSAL credentials** — client secret or managed identity for your bot's app registration.
3. **.NET 8 or higher** installed.

### Set up the project

Create a new project and install the SDK:

```bash
dotnet new web -n AgenticBot
cd AgenticBot
dotnet add package Microsoft.Teams.Apps --prerelease
```

Configure your app credentials in `appsettings.json`. The `ClientId` is your Agent Blueprint ID from the Agents 365 app registration:

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "your-tenant-id",
    "ClientId": "your-agent-blueprint-id",
    "ClientCredentials": [
      {
        "SourceType": "ClientSecret",
        "ClientSecret": "your-client-secret"
      }
    ]
  }
}
```

### Write the bot

Create a `Program.cs` that handles messages and uses the agentic identity to call Teams APIs on behalf of the user:

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Schema;

var builder = WebApplication.CreateSlimBuilder(args);
builder.Services.AddTeamsBotApplication();
var app = builder.Build();

var teams = app.UseTeamsBotApplication();

teams.OnMessage(async (context, cancellationToken) =>
{
    // Check if this message came from an agentic context
    var agenticIdentity = context.Activity.From?.GetAgenticIdentity();

    if (agenticIdentity is not null)
    {
        context.Log.Info(
            $"Acting on behalf of user {agenticIdentity.AgenticUserId} " +
            $"via app {agenticIdentity.AgenticAppId}");

        // Send a reply — the SDK automatically uses the user-delegated token
        // because the agentic identity is on the incoming activity's From field
        await context.SendActivityAsync(
            "I'm responding on your behalf with your permissions.",
            cancellationToken);

        // Call Teams APIs with the user's identity
        // The API client extracts the AgenticIdentity from the activity
        // and acquires a user-delegated token via MSAL
        var updated = TeamsActivity.CreateBuilder()
            .WithType(TeamsActivityType.Message)
            .WithText("This message was updated on your behalf!")
            .Build();

        await context.Api.Conversations.Activities.UpdateAsync(
            context.Activity.Conversation.Id,
            context.Activity.Id!,
            updated,
            cancellationToken);
    }
    else
    {
        // Standard bot-identity response
        await context.SendActivityAsync(
            "I'm responding as the bot (app-only identity).",
            cancellationToken);
    }
});

app.Run();
```

### Understand the flow

When your bot receives a message from an agentic context, here's what happens step by step:

1. **Teams delivers the activity** with `From.AgenticAppId`, `From.AgenticUserId`, and `From.AgenticAppBlueprintId` populated.

2. **Your handler runs.** The `context.Activity.From` has the agentic fields available via `GetAgenticIdentity()`.

3. **You call `context.Api`** to perform a Teams API operation. The SDK's `ActivityClient` (or `MemberClient`, `ReactionClient`, etc.) internally calls `AgenticIdentity.FromAccount(activity.From)` to extract the identity.

4. **MSAL acquires a user-delegated token** using the agentic identity fields. This happens transparently — no manual token code.

5. **The API call executes** with the user's permissions, not the bot's app-only permissions.

### Using agentic identity with specific API clients

The agentic identity flows automatically through most operations. Here are some examples:

**Updating an activity on behalf of the user:**

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    // Update a previous message — the SDK extracts the agentic identity
    // from the activity and uses it for user-delegated token acquisition
    var updatedActivity = TeamsActivity.CreateBuilder()
        .WithType(TeamsActivityType.Message)
        .WithText("Updated message content")
        .Build();

    await context.Api.Conversations.Activities.UpdateAsync(
        context.Activity.Conversation.Id,
        previousActivityId,
        updatedActivity,
        cancellationToken);
});
```

**Adding a reaction on behalf of the user:**

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    // Add a reaction — pass the agentic identity explicitly
    // for operations where the identity comes from the recipient
    await context.Api.Conversations.Reactions.AddAsync(
        context.Activity.Conversation.Id,
        targetMessageId,
        "1f44d_thumbsup",
        context.Activity.Recipient?.GetAgenticIdentity(),
        cancellationToken);
});
```

**Getting meeting details with user permissions:**

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    var meeting = await context.Api.Meetings
        .GetByIdAsync(meetingId, cancellationToken: cancellationToken);

    await context.SendActivityAsync(
        $"Meeting: {meeting?.Details?.Title ?? "Unknown"}",
        cancellationToken);
});
```

## What the SDK Handles for You

The agentic identity support is designed to be transparent. Here's what you don't need to do:

- **No manual identity extraction** — `AgenticIdentity.FromAccount()` is called internally by every API client that needs it.
- **No token management** — MSAL handles user-delegated token acquisition, caching, and refresh. You never see a token string.
- **No per-client configuration** — All API clients (`ActivityClient`, `ReactionClient`, `MemberClient`, `MeetingClient`, `TeamClient`) support agentic identity. It flows through automatically.
- **No conditional logic for token type** — The SDK determines whether to use app-only or user-delegated tokens based on whether an `AgenticIdentity` is present on the activity.

The only thing you need to set up is the app registration and MSAL credentials in your configuration. The SDK does the rest.

## Get Started

Install the SDK:

```bash
dotnet add package Microsoft.Teams.Apps --prerelease
```

Set up your app registration for agentic scenarios following the [Agents 365 setup guide](https://learn.microsoft.com/agents-365/setup), then use the tutorial above to build your first agentic bot.

**More in this series:**
- [Announcing Teams SDK for .NET 2.1 preview](/blog/announcing-teams-sdk-dotnet-2-1-preview)
- [Bring your Bot Framework .NET projects to Teams SDK 2.1 preview](/blog/bring-botframework-to-teams-sdk-dotnet-2-1)
