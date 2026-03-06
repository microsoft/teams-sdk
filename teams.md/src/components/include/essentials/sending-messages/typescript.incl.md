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

In TypeScript, preview features are indicated in documentation and do not need any sort of suppression. No opt-in is required.

<!-- reactions-preview-note -->

In TypeScript, preview features are indicated in documentation and do not need any sort of suppression. No opt-in is required.
