<!-- basic-message-example -->

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    await context.Send($"you said: {context.activity.Text}", cancellationToken);
});
```

<!-- signin-example -->

  ```csharp
  app.OnVerifyState(async (context, cancellationToken) =>
  {
      await context.Send("You have successfully signed in!", cancellationToken);
  });
  ```

<!-- signin-event-name -->

`SignIn.VerifyState`

<!-- streaming-example -->

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    context.Stream.Emit("hello");
    context.Stream.Emit(", ");
    context.Stream.Emit("world!");
    // result message: "hello, world!"
    return Task.CompletedTask;
});
```

<!-- mention-method-name -->

`AddMention`

<!-- mention-example -->

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    await context.Send(new MessageActivity("hi!").AddMention(activity.From), cancellationToken);
});
```

<!-- targeted-method-name -->

`WithRecipient`

<!-- targeted-send-example -->

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    // Using WithRecipient with isTargeted=true explicitly targets the specified recipient
    await context.Send(
        new MessageActivity("This message is only visible to you!")
            .WithRecipient(context.Activity.From, isTargeted: true),
        cancellationToken
    );
});
```

<!-- targeted-preview-note -->

:::tip[.NET]
In .NET, targeted message APIs are marked with `[Experimental("ExperimentalTeamsTargeted")]` and will produce a compiler error until you opt in. Suppress the diagnostic inline with `#pragma warning disable ExperimentalTeamsTargeted` or project-wide in your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);ExperimentalTeamsTargeted</NoWarn>
</PropertyGroup>
```
:::

<!-- context-send-method-name -->

`Send()`

<!-- context-reply-method-name -->

`Reply()`

<!-- threading-reactive-example -->

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    // Send in the same thread, no quote
    await context.Send("Acknowledged", cancellationToken);

    // Send in the same thread with a visual quote of the inbound message
    await context.Reply("Got it!", cancellationToken);
});
```

<!-- quoted-replies-receive-example -->

```csharp
app.OnMessage(async context =>
{
    var quotes = context.Activity.GetQuotedMessages();

    if (quotes.Count > 0)
    {
        var quote = quotes[0].QuotedReply;
        await context.Reply(
            $"You quoted message {quote.MessageId} from {quote.SenderName}: \"{quote.Preview}\"");
    }
});
```

<!-- quoted-replies-reply-example -->

```csharp
app.OnMessage(async context =>
{
    // Reply() automatically quotes the inbound message
    await context.Reply("Got it!");
});
```

<!-- quoted-replies-quote-reply-example -->

```csharp
app.OnMessage(async context =>
{
    // Quote a specific message by its ID
    var parentMessageId = "1772050244572";
    await context.Quote(parentMessageId, "Referencing an earlier message");
});
```

<!-- quoted-replies-builder-example -->

```csharp
var parentMessageId = "1772050244572";
var firstMessageId = "1772050244573";
var secondMessageId = "1772050244574";

// Single quote with response below it
var msg = new MessageActivity()
    .AddQuote(parentMessageId, "Here is my response");
await app.Send(conversationId, msg);

// Multiple quotes with interleaved responses
msg = new MessageActivity()
    .AddQuote(firstMessageId, "response to first")
    .AddQuote(secondMessageId, "response to second");
await app.Send(conversationId, msg);

// Grouped quotes — omit response to group quotes together
msg = new MessageActivity("see below for previous messages")
    .AddQuote(firstMessageId)
    .AddQuote(secondMessageId, "response to both");
await app.Send(conversationId, msg);
```

<!-- quoted-replies-preview-note -->

:::tip[.NET]
In .NET, quoted reply APIs are marked with `[Experimental("ExperimentalTeamsQuotedReplies")]` and will produce a compiler error until you opt in. Suppress the diagnostic inline with `#pragma warning disable ExperimentalTeamsQuotedReplies` or project-wide in your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);ExperimentalTeamsQuotedReplies</NoWarn>
</PropertyGroup>
```
:::
