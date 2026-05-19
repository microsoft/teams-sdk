---
slug: reaction-extensibility-preview
title: "Agents Can Now Send Reactions to Messages in Microsoft Teams"
date: 2026-05-18
authors:
  - name: Ricky Castaneda
    title: Microsoft
    url: https://github.com/MSFTRickyCastaneda
    image_url: https://github.com/MSFTRickyCastaneda.png
tags: [teams-sdk, reactions, preview, announcement, agents]
description: Your Teams agents can now react to messages with emoji - acknowledge, confirm, celebrate, and listen without sending a single extra reply.
---

**Public Preview | May 2026**

Your Teams agents can now react to messages with emojis - acknowledge, confirm, celebrate, and listen without sending a single extra reply. Available today in public preview across .NET, TypeScript, and Python.

<!-- truncate -->

## The Problem: Messages Can Be Too Noisy

Every interaction your agent has today requires a full message. A user submits a request? Your bot sends "Got it." A task completes? Another message. Someone asks a yes/no question? Yet another reply cluttering the thread.

Meanwhile, humans communicate volumes with a single 👍.

Agent reactions bridge that gap. Your agent can now participate in the lightweight, non-verbal layer of conversation that makes Teams collaboration feel natural.

## What You Can Do

| Capability | Description |
| --- | --- |
| Add reactions | React to any message your agent can see - 1:1, group chat, or channel |
| Remove reactions | Programmatically remove reactions as context changes |
| Receive reaction events | Get notified when users react to your agent's messages |
| Emoji library | Discover EmojiIDs via the new Teams Reactions Reference |


## Real-World Scenarios

### 1. Instant Acknowledgment

User submits a request - agent reacts with 👍 ```(like)``` immediately. No "I'm on it" message required. The user knows they've been heard.

### 2. Progress Signaling

Agent reacts with one emoji while processing, then swaps to another on completion. One message, two state updates - zero thread noise.

```csharp
// Signal processing started
// Add reaction to message
await client.Send(
    new MessageReactionActivity()
        .AddReaction(new Reaction() { Type = "happyface" })
        .WithReplyToId(activity.Id));

// ... task completes ...

// Swap to celebration
// Remove previously added reaction
await client.Send(
    new MessageReactionActivity()
        .RemoveReaction(new Reaction() { Type = "happyface" })
        .WithReplyToId(activity.Id));

// Add new reaction to replace removed reaction
await client.Send(
    new MessageReactionActivity()
        .AddReaction(new Reaction() { Type = "like" })
        .WithReplyToId(activity.Id));
```

### 3. Silent Celebrations

Agent monitors a channel for deployment events. Successful deployment? React with 🎉. The team gets signal without additional thread clutter.

## Adding a Reaction

### TypeScript

```typescript
// Add a reaction
app.on('mention', async ({ activity, send }) => {
  await send(new MessageReactionActivity({
    replyToId: activity.id,
    reactions: [like]
  }));
});
```

### .NET

```csharp
// Add a reaction
[Message]
public async Task OnMessage(
    [Context] MessageActivity activity,
    [Context] IContext.Client client)
{
    if (activity.IsRecipientMentioned)
    {
        await client.Send(
            new MessageReactionActivity()
                .AddReaction(new Reaction()
                {
                    Type = "like"
                })
                .WithReplyToId(activity.Id));
    }
}
```

### Python

```python
# Add a reaction
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    if ctx.activity.is_recipient_mentioned:
        await ctx.send(
            MessageReactionActivityInput(
                reply_to_id=ctx.activity.id
            ).add_reaction(
                MessageReaction(type="like")
            )
        )
```

## Removing a Reaction

The pattern is similar across languages: remove the reaction using each SDK's removal API (`RemoveReaction` in .NET, and the reactions `delete` APIs in TypeScript and Python).

### TypeScript

```typescript
// Remove a reaction
app.on('message', async ({ activity, api }) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await api.conversations.reactions.delete(activity.conversation.id, activity.id, 'like');
});
```

### .NET

```csharp
// Remove a reaction
await client.Send(
    new MessageReactionActivity()
        .RemoveReaction(new Reaction() { Type = "like" })
        .WithReplyToId(activity.Id));
```

### Python

```python
# Remove a reaction
await ctx.send(
    MessageReactionActivityInput(
        reply_to_id=ctx.activity.id
    ).remove_reaction(
        MessageReaction(type="like")
    )
)
```
## Listening to Reactions
### TypeScript
```typescript
// Listen for a reaction added to agent message
app.on('messageReaction', async ({ activity }) => {
  for (const reaction of activity.reactionsAdded ?? []) {
    console.log(`User added reaction: ${reaction.type}`);
  }
// Listen for a reaction removed from agent message
  for (const reaction of activity.reactionsRemoved ?? []) {
    console.log(`User removed reaction: ${reaction.type}`);
  }
});
```

### .NET

```csharp
// Listen for a reaction added to agent message
app.OnMessageReactionAdded(async (context, cancellationToken) =>{
    foreach (var reaction in context.Activity.ReactionsAdded ?? []){
        Console.WriteLine($"User added reaction: {reaction.Type}");}
});
// Listen for a reaction removed from agent message
app.OnMessageReactionRemoved(async (context, cancellationToken) =>{
    foreach (var reaction in context.Activity.ReactionsRemoved ?? []){
        Console.WriteLine($"User removed reaction: {reaction.Type}");}
});
```

### Python
```python
# Listen for a reaction added to agent message
@app.on_message_reaction
async def handle_reaction(ctx: ActivityContext[MessageReactionActivity]):
    for reaction in ctx.activity.reactions_added or []:
        print(f"User added reaction: {reaction.type}")
# Listen for a reaction removed from agent message
    for reaction in ctx.activity.reactions_removed or []:
        print(f"User removed reaction: {reaction.type}")
```

## Reaction IDs (EmojiIDs)

Reactions use Teams EmojiID strings - not Unicode emoji characters. Here are some examples:

| EmojiID | Emoji | Diverse (skin tones) |
| --- | --- | --- |
| `like` | 👍 | No |
| `heart` | ❤️ | No |
| `happyface` | 😊 | No |
| `grinningfacewithsmilingeyes` | 😄 | No |
| `1f603_grinningfacewithbigeyes` | 😃 | No |
| `1f44b_wavinghand` | 👋 | Yes |
| `1f590_handwithfingerssplayed` | 🖐️ | Yes |
| `1f91a_raisedbackofhand` | 🤚 | Yes |

Skin-tone variants are supported via suffix modifiers:

- `1f44b_wavinghand-tone1`
- `1f44b_wavinghand-tone2`
- `1f44b_wavinghand-tone3`
- `1f44b_wavinghand-tone4`
- `1f44b_wavinghand-tone5`

Alongside this preview, we're publishing the [**Teams Reactions Reference**](https://learn.microsoft.com/microsoftteams/platform/agents-in-teams/teams-reactions-reference) - the canonical developer resource for discovering valid EmojiIDs supported by Teams.

The reference includes:

- Complete catalog of supported EmojiIDs organized by category (Smileys, Hand gestures, etc.)
- Skin-tone variations for diverse emojis
- EmojiID string format documentation

👉 [**Explore the Teams Reactions Reference**](https://learn.microsoft.com/microsoftteams/platform/agents-in-teams/teams-reactions-reference)

## Prerequisites

| Requirement | Details |
| --- | --- |
| SDK version | Latest Teams SDK - NuGet (.NET), npm (TS), PyPI (Python) |
| Bot registration | Azure Bot Service registration |
| Conversation access | Agent must be installed in the target chat/channel |
| Permissions | No additional manifest permissions beyond standard bot capabilities |

## Preview Boundaries

This is a public preview. Here's what's in scope:

**Supported**

- Standard Teams emoji reactions (full EmojiID catalog)
- 1:1 chats, group chats, channels
- Add, remove, and receive reaction events
- Skin-tone variants for diverse emojis

## What's Next

We're tracking toward general availability with:

- Expanded emoji support (custom emojis)
- Reaction analytics for agent developers
- Richer event payloads for feedback-driven workflows
- Reaction discovery APIs

Your feedback during preview directly shapes the GA release.

## Share Your Feedback

Public preview is when your input has the most impact. Try reactions in your agents, tell us what works, and let us know what's missing.

We can't wait to see what you build. 🎉
