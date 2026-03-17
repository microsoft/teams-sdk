<!-- basic-message-example -->

```csharp
app.OnMessage(async context =>
{
    await context.Send($"you said: {context.activity.Text}");
});
```

<!-- signin-example -->

  ```csharp
  app.OnVerifyState(async context =>
  {
      await context.Send("You have successfully signed in!");
  });
  ```

<!-- signin-event-name -->

`SignIn.VerifyState`

<!-- streaming-example -->

```csharp
app.OnMessage(async context =>
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
app.OnMessage(async context =>
{
    await context.Send(new MessageActivity("hi!").AddMention(activity.From));
});
```

<!-- targeted-method-name -->

`WithRecipient`

<!-- targeted-send-example -->

```csharp
app.OnMessage(async context =>
{
    // Using WithRecipient with isTargeted=true explicitly targets the specified recipient
    await context.Send(
        new MessageActivity("This message is only visible to you!")
            .WithRecipient(context.Activity.From, isTargeted: true)
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

<!-- reactions-preview-note -->

:::tip[.NET]
In .NET, reaction APIs are marked with `[Experimental("ExperimentalTeamsReactions")]` and will produce a compiler error until you opt in. Suppress the diagnostic inline with `#pragma warning disable ExperimentalTeamsReactions` or project-wide in your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);ExperimentalTeamsReactions</NoWarn>
</PropertyGroup>
```
:::


<!-- get-quoted-messages-method-name -->

`GetQuotedMessages()`

<!-- reply-method-name -->

`Reply()`

<!-- quote-reply-method-name -->

`QuoteReply()`

<!-- app-send-method-name -->

`app.Send()`

<!-- add-quoted-reply-method-name -->

`AddQuotedReply()`

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
    await context.QuoteReply("1772050244572", "Referencing an earlier message");
});
```

<!-- quoted-replies-builder-example -->

```csharp
// Single quote with response below it
var msg = new MessageActivity()
    .AddQuotedReply("1772050244572", "Here is my response");
await app.Send(conversationId, msg);

// Multiple quotes with interleaved responses
var msg = new MessageActivity()
    .AddQuotedReply("msg-1", "response to first")
    .AddQuotedReply("msg-2", "response to second");
await app.Send(conversationId, msg);

// Grouped quotes — omit response to group quotes together
var msg = new MessageActivity("see below for previous messages")
    .AddQuotedReply("msg-1")
    .AddQuotedReply("msg-2", "response to both");
await app.Send(conversationId, msg);
```

<!-- quoted-replies-preview-note -->