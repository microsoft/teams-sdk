<!-- reactive -->

```csharp
teamsApp.OnMessage(async (context, cancellationToken) =>
{
    AgenticIdentity? agenticIdentity =
        context.Activity.Recipient?.GetAgenticIdentity();

    if (agenticIdentity?.AgenticUserId is not string agenticUserId)
    {
        throw new InvalidOperationException(
            "The activity is not addressed to an Agentic User.");
    }

    await context.ReplyAsync(
        $"Hi! I'm an Agentic User, and my user ID is {agenticUserId}. Nice to meet you!",
        cancellationToken);
});
```

<!-- reaction -->

```csharp
teamsApp.OnMessage(async (context, cancellationToken) =>
{
    await context.Api.Conversations.AddReactionAsync(
        context.Activity.Conversation.Id,
        context.Activity.Id,
        ReactionType.Like,
        cancellationToken: cancellationToken
    );
});
```

<!-- proactive -->

```csharp
var agenticIdentity = new AgenticIdentity
{
    AgenticAppId = agenticAppId,
    AgenticUserId = agenticUserId,
    AgenticAppBlueprintId = blueprintId,
    TenantId = tenantId
};

await teamsApp.SendAsync(
    conversationId,
    "Your scheduled update is ready.",
    serviceUrl,
    agenticIdentity,
    cancellationToken);

ApiClient api = teamsApp.Api
    .ForServiceUrl(serviceUrl)
    .ForAgenticIdentity(agenticIdentity);

await api.Conversations.AddReactionAsync(
    conversationId,
    activityId,
    ReactionType.Like,
    cancellationToken: cancellationToken);
```
