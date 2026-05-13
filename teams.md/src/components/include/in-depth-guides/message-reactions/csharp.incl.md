<!-- adding-reaction -->

:::tip[.NET]
The reaction APIs are marked with `[Experimental("ExperimentalTeamsReactions")]` and produce a compiler error until you opt in. Suppress the diagnostic inline with `#pragma warning disable ExperimentalTeamsReactions` or project-wide in your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);ExperimentalTeamsReactions</NoWarn>
</PropertyGroup>
```
:::

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    await context.Send("Hello! I'll react to your message.", cancellationToken);

    // Add a reaction to the incoming message
    await context.Api.Conversations.Reactions.AddAsync(
        context.Activity.Conversation.Id,
        context.Activity.Id,
        ReactionType.Like,
        cancellationToken: cancellationToken
    );
});
```

<!-- removing-reaction -->

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    // First, add a reaction
    await context.Api.Conversations.Reactions.AddAsync(
        context.Activity.Conversation.Id,
        context.Activity.Id,
        ReactionType.Heart,
        cancellationToken: cancellationToken
    );

    // Wait a bit, then remove it
    await Task.Delay(2000, cancellationToken);
    await context.Api.Conversations.Reactions.DeleteAsync(
        context.Activity.Conversation.Id,
        context.Activity.Id,
        ReactionType.Heart,
        cancellationToken: cancellationToken
    );
});
```

<!-- reaction-types -->

- `ReactionType.Like` — 👍
- `ReactionType.Heart` — ❤️
- `ReactionType.Eyes` — 👀
- `ReactionType.CheckMark` — ✅
- `ReactionType.Launch` — 🚀
- `ReactionType.Pushpin` — 📌

<!-- receiving-reactions -->

.NET exposes a single `OnMessageReaction` handler plus dedicated `OnMessageReactionAdded` / `OnMessageReactionRemoved` sub-handlers.

```csharp
app.OnMessageReactionAdded(async (context, cancellationToken) =>
{
    foreach (var reaction in context.Activity.ReactionsAdded ?? [])
    {
        Console.WriteLine($"User added reaction: {reaction.Type}");
    }
});

app.OnMessageReactionRemoved(async (context, cancellationToken) =>
{
    foreach (var reaction in context.Activity.ReactionsRemoved ?? [])
    {
        Console.WriteLine($"User removed reaction: {reaction.Type}");
    }
});
```

If you only need a single handler that runs for both adds and removes, use `app.OnMessageReaction` instead.
