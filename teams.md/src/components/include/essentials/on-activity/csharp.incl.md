<!-- intro -->

The Teams SDK exposes a fluent router so you can subscribe to these activities with dedicated handler methods using minimal APIs.

<!-- basic-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

Slash commands arrive as targeted messages. Check `Recipient.IsTargeted` and handle them explicitly:

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    await context.Send($"you said: {context.Activity.Text}", cancellationToken);
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    await context.SendAsync($"you said: {context.Activity.Text}", cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- example-explanation -->

In the above example, the `context.Activity` property is of type `MessageActivity`, which has a `Text` property. You'll notice that the handler here does not return anything, but instead handles the activity by `Send`ing a message back. For message activities, Teams does not expect your application to return anything (though it's usually a good idea to send some sort of friendly acknowledgment!).

<!-- slash-command-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

Slash commands arrive as targeted messages. Check `Recipient.IsTargeted` and handle them explicitly:

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    if (context.Activity.Recipient?.IsTargeted == true)
    {
        await context.Send($"Received slash command: {context.Activity.Text}", cancellationToken);
    }
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

Slash commands arrive as targeted messages. Check `Recipient.IsTargeted` and handle them explicitly:

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    if (context.Activity.Recipient?.IsTargeted == true)
    {
        await context.SendAsync($"Received slash command: {context.Activity.Text}", cancellationToken);
    }
});
```

  </TabItem>
</Tabs>

<!-- middleware-intro -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

The `OnActivity` activity handlers (and attributes) follow a [middleware](https://www.patterns.dev/vanilla/mediator-pattern/) pattern similar to how `dotnet` middlewares work. This means that for each activity handler, a `Next` function is passed in which can be called to pass control to the next handler. This allows you to build a chain of handlers that can process the same activity in different ways.

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

The 2.1 runs cross-cutting logic through **turn middleware** rather than chained activity handlers. Implement `ITurnMiddleware` and register it with `teams.UseMiddleware(...)`. Each middleware receives a `NextTurn` delegate it can `await` to pass control to the next middleware (and ultimately your activity handlers), giving you a familiar ASP.NET-style pipeline.

  </TabItem>
</Tabs>

<!-- middleware-examples -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    Console.WriteLine("global logger");
    context.Next(); // pass control onward
    return Task.CompletedTask;
});
```

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    if (context.Activity.Text == "/help")
    {
        await context.Send("Here are all the ways I can help you...", cancellationToken);
    }

    // Conditionally pass control to the next handler
    context.Next();
});

app.OnMessage(async (context, cancellationToken) =>
{
    // Fallthrough to the final handler
    await context.Send($"Hello! you said {context.Activity.Text}", cancellationToken);
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

Define a middleware by implementing `ITurnMiddleware`:

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Core;
using Microsoft.Teams.Core.Schema;

internal class LoggingMiddleware : ITurnMiddleware
{
    public async Task OnTurnAsync(
        BotApplication botApplication,
        CoreActivity activity,
        NextTurn nextTurn,
        CancellationToken cancellationToken = default)
    {
        Console.WriteLine($"global logger: {activity.Type}");

        // pass control to the next middleware / activity handlers
        await nextTurn(cancellationToken);
    }
}
```

Register it before your handlers run:

```csharp
teams.UseMiddleware(new LoggingMiddleware());

teams.OnMessage(async (context, cancellationToken) =>
{
    await context.SendAsync($"Hello! you said {context.Activity.Text}", cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- activity-reference-footer -->

N/A
