<!-- adding-reaction -->

```typescript
app.on('message', async ({ activity, api, send }) => {
  await send("Hello! I'll react to your message.");

  // Add a reaction to the incoming message
  await api.reactions.add(activity.conversation.id, activity.id, 'like');
});
```

<!-- removing-reaction -->

```typescript
app.on('message', async ({ activity, api }) => {
  // First, add a reaction
  await api.reactions.add(activity.conversation.id, activity.id, 'heart');

  // Wait a bit, then remove it
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await api.reactions.delete(activity.conversation.id, activity.id, 'heart');
});
```

<!-- reaction-types -->

- `'like'` — 👍
- `'heart'` — ❤️
- `'1f440_eyes'` — 👀
- `'2705_whiteheavycheckmark'` — ✅
- `'launch'` — 🚀
- `'1f4cc_pushpin'` — 📌

<!-- receiving-reactions -->

```typescript
app.on('messageReaction', async ({ activity }) => {
  for (const reaction of activity.reactionsAdded ?? []) {
    console.log(`User added reaction: ${reaction.type}`);
  }

  for (const reaction of activity.reactionsRemoved ?? []) {
    console.log(`User removed reaction: ${reaction.type}`);
  }
});
```
