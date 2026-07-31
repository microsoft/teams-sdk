<!-- inspect-recipient -->

```typescript
app.on('message', async ({ activity, log }) => {
  log.info('Agentic User recipient', {
    agenticAppInstanceId: activity.recipient.agenticAppId,
    agenticUserId: activity.recipient.agenticUserId,
    agenticBlueprintId: activity.recipient.agenticAppBlueprintId,
    tenantId: activity.recipient.tenantId,
  });
});
```

<!-- reactive-send -->

```typescript
app.on('message', async ({ activity, api, reply, send }) => {
  if (activity.text?.includes('react')) {
    await api.conversations.addReaction(
      activity.conversation.id,
      activity.id,
      'like',
    );
    await reply('I added a reaction as this Agentic User.');
    return;
  }

  await send(`You said: ${activity.text}`);
});
```

<!-- require-agentic-user -->

```typescript
app.on('message', async ({ activity, send }) => {
  const { agenticAppId, agenticUserId } = activity.recipient;

  if (!agenticAppId || !agenticUserId) {
    throw new Error('This route requires an Agentic User recipient.');
  }

  const state = await loadAgentState({
    tenantId: activity.recipient.tenantId ?? configuredTenantId,
    agenticUserId,
  });
  await send(`Loaded configuration for ${state.displayName}.`);
});
```
