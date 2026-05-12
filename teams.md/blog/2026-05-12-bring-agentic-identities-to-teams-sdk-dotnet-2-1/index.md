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

Your bot can now act on behalf of users, not just as itself. [Teams SDK for .NET 2.1 preview](/blog/announcing-teams-sdk-dotnet-2-1-preview) has built-in support for agentic identities, enabling bots to acquire user-delegated tokens and perform actions with the user's permissions. The SDK handles identity extraction and token acquisition transparently — you focus on what your bot does, not on token plumbing.

For the full conceptual background on agentic identities and Agents 365, see the [Agents 365 documentation](https://learn.microsoft.com/agents-365).

<!-- truncate -->

## What Is an Agentic Identity?

Traditional bots authenticate as themselves using app-only tokens. They can send messages and call APIs, but only with the permissions granted to the app registration. An agentic identity changes this: the bot acts **on behalf of a specific user**, using that user's permissions and identity.

Three fields on `ConversationAccount` make this work:

| Field | Purpose |
|-------|---------|
| `agenticAppId` | The app ID of the agent acting on behalf of the user |
| `agenticUserId` | The user whose identity the agent is delegating |
| `agenticAppBlueprintId` | The blueprint ID for the agentic app configuration |

When Teams delivers an activity from an agentic context, these fields are populated on `activity.From`. The SDK reads them automatically and uses them to acquire user-delegated tokens via MSAL.

For a deeper explanation of how agentic identities work in the Agents 365 ecosystem, see the [Agents 365 identity documentation](https://learn.microsoft.com/agents-365/identity).

## How It Works in the SDK

The SDK handles the full agentic identity flow automatically. Here's what happens when an activity arrives:

```
Incoming activity
  → activity.From contains agenticAppId, agenticUserId, agenticAppBlueprintId
  → AgenticIdentity.FromAccount(activity.From) extracts them
  → API clients thread the identity into every outbound call
  → MSAL acquires a user-delegated token transparently
  → The API call executes with the user's permissions
```

In code, the `AgenticIdentity` is extracted from the `ConversationAccount`:

```csharp
// The SDK does this internally — you don't need to call it manually
AgenticIdentity? identity = AgenticIdentity.FromAccount(activity.From);

// identity.AgenticAppId       → "app-id-123"
// identity.AgenticUserId      → "user-id-456"
// identity.AgenticAppBlueprintId → "blueprint-id-789"
```

Every API client in the SDK — `ActivityClient`, `ReactionClient`, `MemberClient`, `MeetingClient`, `TeamClient` — accepts an `AgenticIdentity` and threads it through to MSAL for token acquisition. When you use `context.Api` in a handler, this happens automatically.

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
