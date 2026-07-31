<!-- reactive -->

```csharp
teamsApp.OnMessage(async (context, cancellationToken) =>
{
    AgenticUser? agenticUser = context.Activity.Recipient?.GetAgenticUser();

    await context.ReplyAsync(
        $"Hi! I'm an Agentic User, and my user ID is {agenticUser?.AgenticUserId}. Nice to meet you!",
        cancellationToken);
});
```

<!-- reaction -->

```csharp
teamsApp.OnMessage(async (context, cancellationToken) =>
{
    await context.Api.Conversations.Reactions.AddAsync(
        context.Activity.Conversation.Id,
        context.Activity.Id,
        ReactionType.Like,
        cancellationToken: cancellationToken
    );
});
```

<!-- proactive -->

```csharp
var agenticUser = new AgenticUser
{
    AgenticAppInstanceId = agenticAppInstanceId,
    AgenticUserId = agenticUserId,
    TenantId = tenantId
};
AgenticIdentity identity = AgenticIdentity.FromAgenticUser(agenticUser);

await teamsApp.SendAsync(
    conversationId,
    "Your scheduled update is ready.",
    serviceUrl,
    identity,
    cancellationToken);

ApiClient api = teamsApp.Api
    .ForServiceUrl(serviceUrl)
    .ForAgenticIdentity(identity);

await api.Conversations.Reactions.AddAsync(
    conversationId,
    activityId,
    ReactionType.Like,
    cancellationToken: cancellationToken);
```
