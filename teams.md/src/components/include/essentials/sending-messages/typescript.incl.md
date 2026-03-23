<!-- basic-message-example -->

```typescript
app.on('message', async ({ activity, send }) => {
  await send(`You said: ${activity.text}`);
});
```

<!-- signin-example -->

```typescript
app.on('signin.verify-state', async ({ send }) => {
  await send('You have successfully signed in!');
});
```

<!-- signin-event-name -->

`signin.verify-state`

<!-- streaming-example -->

```typescript
app.on('message', async ({ activity, stream }) => {
  stream.emit('hello');
  stream.emit(', ');
  stream.emit('world!');

  // result message: "hello, world!"
});
```

<!-- mention-method-name -->

`addMention`

<!-- mention-example -->

```typescript
app.on('message', async ({ send, activity }) => {
  await send(new MessageActivity('hi!').addMention(activity.from));
});
```

<!-- targeted-method-name -->

`withRecipient`

<!-- targeted-send-example -->

```typescript
import { MessageActivity } from '@microsoft/teams.api';

app.on('message', async ({ send, activity }) => {
  // Using withRecipient with isTargeted=true explicitly targets the specified recipient
  await send(
    new MessageActivity('This message is only visible to you!')
      .withRecipient(activity.from, true)
  );
});
```

<!-- targeted-preview-note -->
N/A

<!-- reactions-preview-note -->
N/A


<!-- get-quoted-messages-method-name -->

`getQuotedMessages()`

<!-- reply-method-name -->

`reply()`

<!-- quote-reply-method-name -->

`quoteReply()`

<!-- app-send-method-name -->

`app.send()`

<!-- add-quoted-reply-method-name -->

`addQuotedReply()`

<!-- quoted-replies-receive-example -->

```typescript
app.on('message', async ({ activity, reply }) => {
  const quotes = activity.getQuotedMessages();

  if (quotes.length > 0) {
    const quote = quotes[0].quotedReply;
    await reply(
      `You quoted message ${quote.messageId} from ${quote.senderName}: "${quote.preview}"`
    );
  }
});
```

<!-- quoted-replies-reply-example -->

```typescript
app.on('message', async ({ reply }) => {
  // reply() automatically quotes the inbound message
  await reply('Got it!');
});
```

<!-- quoted-replies-quote-reply-example -->

```typescript
app.on('message', async ({ quoteReply }) => {
  // Quote a specific message by its ID
  await quoteReply('1772050244572', 'Referencing an earlier message');
});
```

<!-- quoted-replies-builder-example -->

```typescript
import { MessageActivity } from '@microsoft/teams.api';

// Single quote with response below it
let msg = new MessageActivity()
  .addQuotedReply('1772050244572', 'Here is my response');
await app.send(conversationId, msg);

// Multiple quotes with interleaved responses
msg = new MessageActivity()
  .addQuotedReply('msg-1', 'response to first')
  .addQuotedReply('msg-2', 'response to second');
await app.send(conversationId, msg);

// Grouped quotes — omit response to group quotes together
msg = new MessageActivity('see below for previous messages')
  .addQuotedReply('msg-1')
  .addQuotedReply('msg-2', 'response to both');
await app.send(conversationId, msg);
```

<!-- quoted-replies-preview-note -->
N/A