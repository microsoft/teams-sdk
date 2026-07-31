<!-- create-agentic-user -->

```typescript
const agenticUser = app.getAgenticUser(
  '<agentic-app-instance-id>',
  '<agentic-user-id>',
);
```

For a tenant or blueprint different from the app defaults:

```typescript
const agenticUser = app.getAgenticUser(
  '<agentic-app-instance-id>',
  '<agentic-user-id>',
  {
    tenantId: '<tenant-id>',
    agenticBlueprintId: '<blueprint-client-id>',
  },
);
```

<!-- app-send -->

```typescript
await app.initialize();

await app.send(
  conversationId,
  {
    type: 'message',
    text: 'Your weekly project update is ready.',
  },
  { agenticUser },
);
```

<!-- scoped-api -->

```typescript
const agenticUserApi = app.api.forAgenticUser(agenticUser);

await agenticUserApi.conversations
  .activities(conversationId)
  .create({
    type: 'message',
    text: 'Sent through an Agentic User-scoped API client.',
  });
```
