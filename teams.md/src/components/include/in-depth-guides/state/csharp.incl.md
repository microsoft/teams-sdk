<!-- setup-example -->

```csharp title="Program.cs"
using Microsoft.Teams.Apps;

WebApplicationBuilder builder = WebApplication.CreateSlimBuilder(args);
builder.Services.AddTeamsBotApplication(options =>
{
    options.UseState();
});

WebApplication app = builder.Build();
TeamsBotApplication teams = app.UseTeamsBotApplication();
```

<!-- oauth-note -->

Registering an OAuth flow with `AddOAuthFlow()` automatically enables state so pending sign-ins can be associated with the correct flow.

<!-- read-write-example -->


```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    // Write
    context.State.ConversationState.Set("lastMessage", context.Activity.Text ?? string.Empty);
    context.State.UserState.Set("messageCount",
        (context.State.UserState.Get<int>("messageCount")) + 1);

    // Read
    string? last = context.State.ConversationState.Get<string>("lastMessage");
    int count = context.State.UserState.Get<int>("messageCount");

    await context.SendAsync(
        $"Message #{count}. Last message was: {last}",
        cancellationToken);
});
```

<!-- state-operations -->

Use `ContainsKey()` to check for a value, `Remove()` to remove one, and `Clear()` to remove all values. If you mutate an object or collection returned by `Get<T>(string)`, call `Set()` with the updated value so the scope is marked for persistence.

<!-- clear-example -->

```csharp
await context.State.DeleteAsync(cancellationToken);
```

<!-- distributed-intro -->

For production or multi-instance deployments, register a shared, durable `IDistributedCache` provider, such as Redis, SQL Server, or Azure Cache for Redis, before calling `UseState()`. The state API used by handlers doesn't change:

<!-- distributed-example -->

```csharp title="Program.cs"
using Microsoft.Teams.Apps;
using StackExchange.Redis;

WebApplicationBuilder builder = WebApplication.CreateSlimBuilder(args);

// Register Redis — UseState() picks this up automatically
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration["Redis:ConnectionString"];
});

builder.Services.AddTeamsBotApplication(options =>
{
    options.UseState();
});
```

<!-- distributed-details -->

The SDK serializes each scope as UTF-8 JSON bytes and replaces the complete scope on save, so concurrent turns use last-writer-wins semantics. Configure cache entry expiration and the key prefix through `UseState()`. Configure any provider-specific options when registering the `IDistributedCache` implementation.
