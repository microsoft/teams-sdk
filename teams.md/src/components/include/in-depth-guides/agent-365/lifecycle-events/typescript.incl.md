<!-- handlers -->

```typescript
app.on('agentLifecycle', async (ctx) => {
  ctx.log.info('Lifecycle event received', {
    valueType: ctx.activity.valueType,
    agenticUserId: ctx.activity.value.agenticUserId,
  });

  // Continue so the matching typed handler can also run.
  await ctx.next();
});

app.on('agenticUserIdentityCreated', ({ activity, log }) => {
  log.info('Agentic User created', {
    agenticUserId: activity.value.agenticUserId,
  });
});

app.on('agenticUserDisabled', ({ activity, log }) => {
  log.info('Agentic User disabled', {
    agenticUserId: activity.value.agenticUserId,
  });
});
```
