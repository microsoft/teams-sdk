<!-- adding-reaction -->

```csharp
app.OnMessage(async context =>
{
    await context.Send("Hello! I'll react to this message.");

    // Add a reaction to the incoming message
    await context.Api.Conversations.Reactions.AddAsync(
        context.Activity.Conversation.Id,
        context.Activity.Id,
        ReactionType.Like
    );
});
```

<!-- removing-reaction -->

```csharp
app.OnMessage(async context =>
{
    // First, add a reaction
    await context.Api.Conversations.Reactions.AddAsync(
        context.Activity.Conversation.Id,
        context.Activity.Id,
        ReactionType.Heart
    );

    // Wait a bit, then remove it
    await Task.Delay(2000);
    await context.Api.Conversations.Reactions.DeleteAsync(
        context.Activity.Conversation.Id,
        context.Activity.Id,
        ReactionType.Heart
    );
});
```

<!-- reaction-types -->

The following reaction types are available:

- `ReactionType.Like` — 👍
- `ReactionType.Heart` — ❤️
- `ReactionType.Checkmark` — ✅
- `ReactionType.Hourglass` — ⏳
- `ReactionType.Pushpin` — 📌
- `ReactionType.Exclamation` — ❗
- `ReactionType.Laugh` — 😆
- `ReactionType.Surprise` — 😮
- `ReactionType.Sad` — 🙁
- `ReactionType.Angry` — 😠

You can also use custom reaction types by creating a new `ReactionType` instance:

```csharp
// Use a custom emoji reaction
var customReaction = new ReactionType("1f44b_wavinghand-tone4");

await context.Api.Conversations.Reactions.AddAsync(
    context.Activity.Conversation.Id,
    context.Activity.Id,
    customReaction
);
```

<!-- advanced-usage -->

For advanced scenarios where you need to use a custom service URL or access the HTTP client directly, you can use the `ApiClient.Client` property:

```csharp
// Access the underlying HTTP client for custom requests
var api = new ApiClient(context.Activity.ServiceUrl, context.Api.Client);

await api.Conversations.Reactions.AddAsync(
    context.Activity.Conversation.Id,
    context.Activity.Id,
    ReactionType.Like
);
```
