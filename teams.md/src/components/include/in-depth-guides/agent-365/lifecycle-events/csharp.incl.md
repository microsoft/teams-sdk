<!-- handlers -->

```csharp
teamsApp.OnAgentLifecycle((context, _) =>
{
    logger.LogInformation(
        "Lifecycle event: {ValueType}",
        context.Activity.ValueType);
    return Task.CompletedTask;
});

teamsApp.OnAgenticUserIdentityCreated((context, _) =>
{
    logger.LogInformation(
        "Agentic User created: {AgenticUserId}",
        context.Activity.Value?.AgenticUserId);
    return Task.CompletedTask;
});

teamsApp.OnAgenticUserDisabled((context, _) =>
{
    logger.LogInformation(
        "Agentic User disabled: {AgenticUserId}",
        context.Activity.Value?.AgenticUserId);
    return Task.CompletedTask;
});
```
