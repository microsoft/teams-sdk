<!-- intro -->

This guide is based on [`samples/McpServer`](https://github.com/microsoft/teams.net/tree/main/samples/McpServer): a single ASP.NET process hosts both Teams (`/api/messages`) and MCP (`/mcp`).

<!-- define-tool -->

The sample uses MCP tool attributes for discovery:

```csharp
[McpServerToolType]
public sealed class McpTools(TeamsBotApplication app, State state, IConfiguration config, GraphClient graph)
{
    [McpServerTool(Name = "notify"), Description("Send a notification to a Teams user. No response expected.")]
    public async Task<NotifyResult> Notify(string userId, string message, CancellationToken cancellationToken = default) { ... }
}
```

<!-- find-user -->

`find_user` delegates to a Graph client and returns stable IDs:

```csharp
[McpServerTool(Name = "find_user"), Description("Find users in this tenant by partial name, email, or UPN.")]
public async Task<FindUserResult> FindUser(string query, CancellationToken cancellationToken = default)
{
    IReadOnlyList<UserMatch> matches = await graph.SearchUsersAsync(query, top: 5, cancellationToken);
    return new FindUserResult(matches);
}
```

<!-- notify -->

`notify` resolves/creates a DM conversation and sends proactively:

```csharp
string conversationId = await GetOrCreateConversationAsync(userId, cancellationToken);
MessageActivityInput notifyActivity = new MessageActivityInput().WithText(message);
await app.ConversationClient.SendActivityAsync(conversationId, notifyActivity, state.ServiceUrl, cancellationToken: cancellationToken);
```

<!-- ask -->

`ask` + `wait_for_reply` use request IDs and waiter tasks:

```csharp
state.PendingAsks[requestId] = new PendingAsk(userId);
await app.ConversationClient.SendActivityAsync(conversationId,
    new MessageActivityInput().WithAdaptiveCardAttachment(Cards.AskCard(requestId, question)),
    state.ServiceUrl,
    cancellationToken: cancellationToken);
```

```csharp
TaskCompletionSource<PendingAsk> waiter = state.ReplyWaiters.GetOrAdd(
    requestId,
    _ => new TaskCompletionSource<PendingAsk>(TaskCreationOptions.RunContinuationsAsynchronously));
PendingAsk result = await waiter.Task.WaitAsync(TimeSpan.FromSeconds(timeoutSeconds), cancellationToken);
```

<!-- ask-handler -->

Card submit updates pending state and resolves waiting callers:

```csharp
case "ask_reply":
    return HandleAskReply(action, state);
...
if (state.ReplyWaiters.TryRemove(requestId, out TaskCompletionSource<PendingAsk>? waiter))
    waiter.TrySetResult(answered);
```

<!-- approval -->

Approvals mirror the ask pattern with explicit decision state:

```csharp
state.Approvals[approvalId] = ApprovalStatus.Pending;
await app.ConversationClient.SendActivityAsync(conversationId,
    new MessageActivityInput().WithAdaptiveCardAttachment(Cards.ApprovalCard(approvalId, title, description)),
    state.ServiceUrl,
    cancellationToken: cancellationToken);
```

<!-- approval-handler -->

Approval card submit wakes `wait_for_approval`:

```csharp
if (state.ApprovalWaiters.TryRemove(approvalId, out TaskCompletionSource<string>? waiter))
    waiter.TrySetResult(decision);
```

<!-- wiring -->

Wire Teams and MCP into one app:

```csharp
WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
builder.Services.AddTeamsBotApplication();
builder.Services.AddSingleton<State>();
builder.Services
    .AddMcpServer()
    .WithHttpTransport()
    .WithTools<McpTools>();

WebApplication webApp = builder.Build();
TeamsBotApplication bot = webApp.UseTeamsBotApplication();
webApp.MapMcp("/mcp");
webApp.Run();
```
