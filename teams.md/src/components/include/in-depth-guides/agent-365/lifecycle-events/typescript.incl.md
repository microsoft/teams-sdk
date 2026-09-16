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
  log.info('Agentic User created', { agenticUserId: activity.value.agenticUserId });
});

app.on('agenticUserIdentityUpdated', ({ activity, log }) => {
  log.info('Agentic User identity updated', {
    updatedProperty: activity.value.updatedProperty,
  });
});

app.on('agenticUserManagerUpdated', ({ activity, log }) => {
  log.info('Agentic User manager updated', { manager: activity.value.manager });
});

app.on('agenticUserEnabled', ({ activity, log }) => {
  log.info('Agentic User enabled', { agenticUserId: activity.value.agenticUserId });
});

app.on('agenticUserDisabled', ({ activity, log }) => {
  log.info('Agentic User disabled', { agenticUserId: activity.value.agenticUserId });
});

app.on('agenticUserDeleted', ({ activity, log }) => {
  log.info('Agentic User deleted', { deletionReason: activity.value.deletionReason });
});

app.on('agenticUserUndeleted', ({ activity, log }) => {
  log.info('Agentic User restored', { agenticUserId: activity.value.agenticUserId });
});

app.on('agenticUserWorkloadOnboardingUpdated', ({ activity, log }) => {
  log.info('Agentic User workload onboarding updated', {
    workloadName: activity.value.workloadName,
    workloadOnboardingState: activity.value.workloadOnboardingState,
  });
});
```
