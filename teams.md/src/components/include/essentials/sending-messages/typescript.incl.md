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
You are not restricted to only replying to `message` activities. In the above example, the handler is listening to `signin.verify-state` events, which are sent when a user successfully signs in.

<!-- streaming-example -->

```typescript
app.on('message', async ({ activity, stream }) => {
  stream.emit('hello');
  stream.emit(', ');
  stream.emit('world!');

  // result message: "hello, world!"
});
```

<!-- streaming-pacing-details -->

`stream.emit()` is fire and forget. It appends to a queue and returns immediately instead of awaiting the network, and a flush then drains the whole queue into one accumulated buffer and sends it as a single typing activity. When further chunks arrive while a send is already in flight, the next flush is scheduled 500ms later, which is what collapses a fast loop into roughly two sends per second. Chunks that arrive slower than a round trip are sent as they come, so the SDK never adds latency to a slow producer.

Failed sends are retried for you with exponential backoff: up to 5 attempts, waiting 500ms, 1s, 2s, and 4s between them. This is a blind retry on transient failures rather than rate limit aware backoff, since the SDK does not read `Retry-After` or treat `429` specially. Terminal `403`s are deliberately excluded, so a stream that has already timed out or been cancelled is never retried back to life.

<!-- streaming-handoff-example -->

```typescript
import { MessageActivityInput } from '@microsoft/teams.api';

app.on('message', async ({ activity, send, stream }) => {
  let opened: number | undefined;
  let text = '';
  let editing = false;
  let messageId: string | undefined;
  let lastEdit = 0;

  for await (const chunk of runAgent(activity.text)) {
    text += chunk;

    // Phase 1: real streaming. The window opens on the first streamed chunk,
    // not when the handler starts, so the clock starts here.
    if (!editing && (opened === undefined || Date.now() - opened < 110_000)) {
      opened ??= Date.now();
      stream.emit(chunk);
      continue;
    }

    // Hand off once, keeping the finalized message's id.
    if (!editing) {
      messageId = (await stream.close())?.id;
      editing = true;
    }

    // Phase 2: plain edits on the same message. No two minute ceiling.
    if (messageId && Date.now() - lastEdit > 3_000) {
      await send(new MessageActivityInput(text).withId(messageId));
      lastEdit = Date.now();
    }
  }

  if (!editing) {
    await stream.close();
  } else if (messageId) {
    await send(new MessageActivityInput(text).withId(messageId));
  } else {
    // close() published nothing, so send the buffered text rather than drop it.
    await send(new MessageActivityInput(text));
  }
});
```

Setting an id on an outgoing activity routes the send through the update path, so each edit replaces the finalized message instead of posting a new one.

<!-- streaming-informative-and-cancel -->

`stream.update()` sends an informative update.
An update emitted after response text has accumulated is ignored.
The SDK learns that the user stopped the stream from the answer to a chunk it sends.
From then on `stream.canceled` is true and `stream.emit()` throws `StreamCancelledError`.
A stream creates its message from response text or an informative update.
If the first output is only attachments, `stream.close()` creates no message, so send the attachments with `send()` instead.

<!-- streaming-threading-options -->

`stream` in a handler is created with this placement already applied.
The `StreamOptions` type, with `replyChain: { chatOrChannelId, replyChainId, inChannel }`, is what `IActivitySender.createStream(ref, options)` accepts when you implement a custom sender, and it is experimental.
Set `inChannel: true` when `chatOrChannelId` is a channel id.
Without it, a 404 from the reply chain route is an error and the stream does not fall back to the inbound conversation.

<!-- mention-method-name -->

`addMention`

<!-- mention-example -->

```typescript
import { MessageActivityInput } from '@microsoft/teams.api';

app.on('message', async ({ send, activity }) => {
  await send(new MessageActivityInput('hi!').addMention(activity.from));
});
```

<!-- targeted-method-name -->

`withRecipient`

<!-- targeted-send-example -->

```typescript
import { MessageActivityInput } from '@microsoft/teams.api';

app.on('message', async ({ send, activity }) => {
  // Using withRecipient with isTargeted=true explicitly targets the specified recipient
  await send(
    new MessageActivityInput('This message is only visible to you!')
      .withRecipient(activity.from, true)
  );
});
```

<!-- prompt-preview-proactive-example -->

```typescript
import { Account, MessageActivityInput } from '@microsoft/teams.api';

const targetedMessageId = '1772050244572';
const conversationId = '19:groupchat-id@thread.v2';
const userAccount: Account = {
  id: '29:1AbCDef...',
  name: 'Adele Vance',
};

const targetedMessage = new MessageActivityInput('Here is the result!')
  .addTargetedMessageInfo(targetedMessageId)
  .withRecipient(userAccount, true);

// Targeted reply (only the user sees it)
await app.send(conversationId, targetedMessage);

// OR public reply (everyone sees it)
const publicMessage = new MessageActivityInput('Here is the result!')
  .addTargetedMessageInfo(targetedMessageId);
await app.send(conversationId, publicMessage);
```

<!-- context-send-method-name -->

`send()`

<!-- context-reply-method-name -->

`reply()`

<!-- threading-reactive-example -->

```typescript
app.on('message', async ({ send, reply }) => {
  // Send reactively without quoting.
  // In a channel, sends in the same thread.
  // In a 1:1 chat, matches the level of the inbound message.
  await send('Acknowledged');

  // Send a reactive, quoted reply.
  // In a channel, sends in the same thread.
  // In a 1:1 chat, matches the level of the inbound message.
  await reply('Got it!');
});
```

<!-- threading-experimental-note -->

The reply chain types and operations are marked `@experimental` (diagnostic `ExperimentalTeamsThreading`) in the API reference.
The marker is documentation only, with no compiler or runtime warning.
It covers `channelData.chat` and `channelData.replyChain`, `api.conversations.createReplyChainActivity` and `createTargetedReplyChainActivity`, `ActivitySenderOptions.replyChainId` and `StreamOptions`.
`send`, `reply` and `app.reply` are not marked.

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
app.on('message', async ({ quote }) => {
  // Quote a specific message by its ID
  const parentMessageId = '1772050244572';
  await quote(parentMessageId, 'Referencing an earlier message');
});
```

<!-- quoted-replies-builder-example -->

```typescript
import { MessageActivityInput } from '@microsoft/teams.api';

const parentMessageId = '1772050244572';
const firstMessageId = '1772050244573';
const secondMessageId = '1772050244574';

// Single quote with response below it
let msg = new MessageActivityInput()
  .addQuote(parentMessageId, 'Here is my response');
await app.send(conversationId, msg);

// Multiple quotes with interleaved responses
msg = new MessageActivityInput()
  .addQuote(firstMessageId, 'response to first')
  .addQuote(secondMessageId, 'response to second');
await app.send(conversationId, msg);

// Grouped quotes — omit response to group quotes together
msg = new MessageActivityInput('see below for previous messages')
  .addQuote(firstMessageId)
  .addQuote(secondMessageId, 'response to both');
await app.send(conversationId, msg);
```

<!-- quoted-replies-preview-note -->
N/A
