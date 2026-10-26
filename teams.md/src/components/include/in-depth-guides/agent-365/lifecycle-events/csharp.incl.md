<!-- handlers -->

```csharp
teamsApp.OnAgentLifecycle((context, _) =>
{
    context.Log.LogInformation(
        "Lifecycle event: {ValueType}",
        context.Activity.ValueType);
    return Task.CompletedTask;
});

teamsApp.OnAgenticUserIdentityCreated((context, _) =>
{
    context.Log.LogInformation(
        "Agentic User created: {AgenticUserId}",
        context.Activity.Value?.AgenticUserId);
    return Task.CompletedTask;
});

teamsApp.OnAgenticUserIdentityUpdated((context, _) =>
{
    context.Log.LogInformation(
        "Agentic User identity updated: {UpdatedProperty}",
        context.Activity.Value?.UpdatedProperty);
    return Task.CompletedTask;
});

teamsApp.OnAgenticUserManagerUpdated((context, _) =>
{
    context.Log.LogInformation(
        "Agentic User manager updated: {Manager}",
        context.Activity.Value?.Manager);
    return Task.CompletedTask;
});

teamsApp.OnAgenticUserEnabled((context, _) =>
{
    context.Log.LogInformation(
        "Agentic User enabled: {AgenticUserId}",
        context.Activity.Value?.AgenticUserId);
    return Task.CompletedTask;
});

teamsApp.OnAgenticUserDisabled((context, _) =>
{
    context.Log.LogInformation(
        "Agentic User disabled: {AgenticUserId}",
        context.Activity.Value?.AgenticUserId);
    return Task.CompletedTask;
});

teamsApp.OnAgenticUserDeleted((context, _) =>
{
    context.Log.LogInformation(
        "Agentic User deleted: {DeletionReason}",
        context.Activity.Value?.DeletionReason);
    return Task.CompletedTask;
});

teamsApp.OnAgenticUserUndeleted((context, _) =>
{
    context.Log.LogInformation(
        "Agentic User restored: {AgenticUserId}",
        context.Activity.Value?.AgenticUserId);
    return Task.CompletedTask;
});

teamsApp.OnAgenticUserWorkloadOnboardingUpdated((context, _) =>
{
    context.Log.LogInformation(
        "Agentic User workload onboarding updated: {WorkloadName} ({State})",
        context.Activity.Value?.WorkloadName,
        context.Activity.Value?.WorkloadOnboardingState);
    return Task.CompletedTask;
});
```
