<!-- general-handler -->

```typescript
app.on('agentLifecycle', async (ctx) => {
  await persistLifecycleEnvelope(ctx.activity);

  // Continue so the matching typed handler can also run.
  await ctx.next();
});
```

<!-- variant-handlers -->

```typescript
app.on('agenticUserIdentityCreated', async ({ activity }) => {
  await createAgentState({
    tenantId: activity.value.tenantId,
    agenticUserId: activity.value.agenticUserId,
    agenticAppInstanceId: activity.value.agenticAppInstanceId,
    version: activity.value.version,
  });
});

app.on('agenticUserIdentityUpdated', async ({ activity }) => {
  await updateAgentProperty({
    agenticUserId: activity.value.agenticUserId,
    property: activity.value.updatedProperty.propertyName,
    value: activity.value.updatedProperty.propertyValue ?? null,
    version: activity.value.version,
  });
});

app.on('agenticUserDeleted', async ({ activity }) => {
  await markAgentDeleted({
    agenticUserId: activity.value.agenticUserId,
    version: activity.value.version,
  });
});
```

<!-- idempotent-handler -->

```typescript
app.on('agenticUserEnabled', async ({ activity }) => {
  const { tenantId, agenticUserId, version } = activity.value;

  if (!tenantId || !agenticUserId) {
    throw new Error('Lifecycle event is missing its Agentic User identity.');
  }

  await applyLifecycleState({
    tenantId,
    agenticUserId,
    version,
    state: 'enabled',
  });
});
```
