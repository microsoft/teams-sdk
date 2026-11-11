<!-- conversation-id-field -->

`conversationId`

<!-- install-handler-example -->

```typescript
import { App } from '@microsoft/teams.apps';
// ...

// This would be some persistent storage
const myConversationIdStorage = new Map<string, string>();

// Installation is just one place to get the conversation id. All activities
// have the conversation id, so you can use any activity to get it.
app.on('install.add', async ({ activity, send }) => {
  // Save the conversation id in
  myConversationIdStorage.set(activity.from.aadObjectId!, activity.conversation.id);

  await send('Hi! I am going to remind you to say something to me soon!');
  notificationQueue.addReminder(activity.from.aadObjectId!, sendProactiveNotification, 10_000);
});
```

<!-- send-proactive-example -->

```typescript
import { MessageActivityInput } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
// ...

const sendProactiveNotification = async (userId: string) => {
  const conversationId = myConversationIdStorage.get(userId);
  if (!conversationId) {
    return;
  }
  const activity = new MessageActivityInput('Hey! It\'s been a while. How are you?');
  await app.send(conversationId, activity);
};
```

<!-- targeted-proactive-example -->

```typescript
import { Account, MessageActivityInput } from '@microsoft/teams.api';

// When sending proactively, you must provide an explicit recipient account
const sendTargetedNotification = async (conversationId: string, recipient: Account) => {
  await app.send(
    conversationId,
    new MessageActivityInput('This is a private notification just for you!')
      .withRecipient(recipient, true)
  );
};
```

<!-- app-reply-method-name -->

`app.reply()`

<!-- app-send-method-name -->

`app.send()`

<!-- threading-proactive-example -->

```typescript
// chatOrChannelId is channelData.chat.id or channelData.channel.id
// replyChainId is channelData.replyChain.id
await app.reply(chatOrChannelId, replyChainId, 'Thread update!');
```

<!-- threading-top-level-example -->

```typescript
// Send a new top-level message to the chat or channel
await app.send(chatOrChannelId, 'Hello!');
```

<!-- threading-agentic-example -->

```typescript
import { getAgenticIdentity } from '@microsoft/teams.api';

// agenticIdentity is undefined unless the recipient is an agentic user
const agenticIdentity = getAgenticIdentity(context.activity.recipient);
await app.reply(chatOrChannelId, replyChainId, 'Thread update!', { agenticIdentity });
```

<!-- threading-service-url-note -->

Inside a handler, a response goes to the `serviceUrl` of the inbound activity.
`app.send()` and `app.reply()` have no inbound activity and take no service URL argument, so they go to the app's service URL: the `serviceUrl` app option, else the `SERVICE_URL` environment variable, else `https://smba.trafficmanager.net/teams`.