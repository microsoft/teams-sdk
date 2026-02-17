<!-- adding-reaction -->

```typescript
app.on('message', async ({ activity, api, send }) => {
  await send("Hello! I'll react to this message.");
  
  // Add a reaction to the incoming message
  await api.conversations.reactions.add(
    activity.conversation.id,
    activity.id,
    'like'
  );
});
```

<!-- removing-reaction -->

```typescript
app.on('message', async ({ activity, api }) => {
  // First, add a reaction
  await api.conversations.reactions.add(
    activity.conversation.id,
    activity.id,
    'heart'
  );
  
  // Wait a bit, then remove it
  await new Promise(resolve => setTimeout(resolve, 2000));
  await api.conversations.reactions.delete(
    activity.conversation.id,
    activity.id,
    'heart'
  );
});
```

<!-- reaction-types -->

The following reaction types are available:

- `'like'` — 👍
- `'heart'` — ❤️
- `'checkmark'` — ✅
- `'hourglass'` — ⏳
- `'pushpin'` — 📌
- `'exclamation'` — ❗
- `'laugh'` — 😆
- `'surprise'` — 😮
- `'sad'` — 🙁
- `'angry'` — 😠

You can also use custom emoji reactions by providing the emoji code:

```typescript
// Use a custom emoji reaction
await api.conversations.reactions.add(
  activity.conversation.id,
  activity.id,
  '1f44b_wavinghand-tone4'
);
```

<!-- advanced-usage -->

For advanced scenarios, you can access the underlying HTTP client or create a custom API client instance:

```typescript
// The API client is available through the context
const { api } = context;

// Use reactions API
await api.conversations.reactions.add(
  conversationId,
  activityId,
  'like'
);
```
