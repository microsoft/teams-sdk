<!-- basic-message-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

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

<!-- signin-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
app.OnVerifyState(async (context, cancellationToken) =>
{
    await context.Send("You have successfully signed in!", cancellationToken);
});
```

You are not restricted to only replying to `message` activities. In the above example, the handler is listening to `OnVerifyState` events, which are sent when a user successfully signs in.

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
var flow = teams.GetOAuthFlow("graph");
flow.OnSignInComplete(async (context, tokenResponse, cancellationToken) =>
{
    await context.SendAsync("You have successfully signed in!", cancellationToken);
});
```
You are not restricted to only replying to `message` activities. In the above example, the handler is listening to `OnSignInComplete` events, which are sent when a user successfully signs in.

  </TabItem>
</Tabs>

<!-- signin-event-name -->

`SignIn.VerifyState` events (SDK 2.0) or `flow.OnSignInComplete(...)` callbacks (SDK 2.1)

<!-- streaming-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

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

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

The 2.1 streams through a `TeamsStreamingWriter`. Create one from the turn context, push informative updates and response chunks, then finalize:

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    TeamsStreamingWriter writer = TeamsStreamingWriter.CreateFromContext(context);

    await writer.SendInformativeUpdateAsync("Thinking…", cancellationToken);

    await writer.AppendResponseAsync("hello", cancellationToken);
    await writer.AppendResponseAsync(", ", cancellationToken);
    await writer.AppendResponseAsync("world!", cancellationToken);

    // flush the accumulated text as the final message: "hello, world!"
    await writer.FinalizeResponseAsync(cancellationToken: cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- mention-method-name -->

`AddMention`

<!-- mention-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    await context.Send(new MessageActivity("hi!").AddMention(context.Activity.From), cancellationToken);
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    await context.SendAsync(
        new MessageActivityInput()
            .WithText("hi!")
            .AddMention(context.Activity.From),
        cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- targeted-method-name -->

`WithRecipient`

<!-- targeted-send-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

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

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    // Using WithRecipient with isTargeted=true explicitly targets the specified recipient
    await context.SendAsync(
        new MessageActivityInput()
            .WithText("This message is only visible to you!")
            .WithRecipient(context.Activity.From, isTargeted: true),
        cancellationToken
    );
});
```

  </TabItem>
</Tabs>

<!-- prompt-preview-proactive-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
var targetedMessageId = "1772050244572";
var conversationId = "19:groupchat-id@thread.v2";
var userAccount = new Account
{
    Id = "29:1AbCDef...",
    Name = "Adele Vance"
};

var targetedMessage = new MessageActivityInput()
    .WithText("Here is the result!")
    .AddTargetedMessageInfo(targetedMessageId)
    .WithRecipient(userAccount, isTargeted: true);

// Targeted reply (only the user sees it)
await app.Send(conversationId, targetedMessage);

// OR public reply (everyone sees it)
var publicMessage = new MessageActivityInput()
    .WithText("Here is the result!")
    .AddTargetedMessageInfo(targetedMessageId);
await app.Send(conversationId, publicMessage);
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
var targetedMessageId = "1772050244572";
var conversationId = "19:groupchat-id@thread.v2";
var userAccount = new Account
{
    Id = "29:1AbCDef...",
    Name = "Adele Vance"
};

var targetedMessage = new MessageActivity("Here is the result!")
    .AddTargetedMessageInfo(targetedMessageId)
    .WithRecipient(userAccount, isTargeted: true);

// Targeted reply (only the user sees it)
await app.Send(conversationId, targetedMessage);

// OR public reply (everyone sees it)
var publicMessage = new MessageActivity("Here is the result!")
    .AddTargetedMessageInfo(targetedMessageId);
await app.Send(conversationId, publicMessage);
```

  </TabItem>
</Tabs>

<!-- context-send-method-name -->

`Send()`

<!-- context-reply-method-name -->

`Reply()`

<!-- threading-reactive-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    // Send in the same thread, no quote
    await context.Send("Acknowledged", cancellationToken);

    // Send in the same thread with a visual quote of the inbound message
    await context.Reply("Got it!", cancellationToken);
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    // Send in the same thread, no quote
    await context.SendAsync("Acknowledged", cancellationToken);

    // Send in the same thread with a visual quote of the inbound message
    await context.Reply("Got it!", cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- quoted-replies-receive-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

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

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    var quotes = context.Activity.GetQuotedMessages();

    if (quotes.Count > 0)
    {
        var quote = quotes[0].QuotedReply;
        await context.Reply(
            $"You quoted message {quote.MessageId} from {quote.SenderName}: \"{quote.Preview}\"",
            cancellationToken);
    }
});
```

  </TabItem>
</Tabs>

<!-- quoted-replies-reply-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
app.OnMessage(async context =>
{
    // Reply() automatically quotes the inbound message
    await context.Reply("Got it!");
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    // Reply() automatically quotes the inbound message
    await context.Reply("Got it!", cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- quoted-replies-quote-reply-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
app.OnMessage(async context =>
{
    // Quote a specific message by its ID
    var parentMessageId = "1772050244572";
    await context.Quote(parentMessageId, "Referencing an earlier message");
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    // Quote a specific message by its ID
    var parentMessageId = "1772050244572";
    await context.Quote(parentMessageId, "Referencing an earlier message", cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- quoted-replies-builder-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
var parentMessageId = "1772050244572";
var firstMessageId = "1772050244573";
var secondMessageId = "1772050244574";

// Single quote with response below it
var msg = new MessageActivityInput()
    .AddQuote(parentMessageId, "Here is my response");
await app.Send(conversationId, msg);

// Multiple quotes with interleaved responses
msg = new MessageActivityInput()
    .AddQuote(firstMessageId, "response to first")
    .AddQuote(secondMessageId, "response to second");
await app.Send(conversationId, msg);

// Grouped quotes — omit response to group quotes together
msg = new MessageActivityInput()
    .WithText("see below for previous messages")
    .AddQuote(firstMessageId)
    .AddQuote(secondMessageId, "response to both");
await app.Send(conversationId, msg);
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

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

  </TabItem>
</Tabs>

<!-- quoted-replies-preview-note -->
N/A
