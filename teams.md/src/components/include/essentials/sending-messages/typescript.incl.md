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
  // Send in the same thread, no quote
  await send('Acknowledged');

  // Send in the same thread with a visual quote of the inbound message
  await reply('Got it!');
});
```

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
