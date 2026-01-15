<!-- conversation-id-field -->

`conversationId`

<!-- install-handler-example -->

```typescript
import { MessageActivity } from '@microsoft/teams.api';
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
import { MessageActivity } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
// ...

const sendProactiveNotification = async (userId: string) => {
  const conversationId = myConversationIdStorage.get(userId);
  if (!conversationId) {
    return;
  }
  const activity = new MessageActivity('Hey! It\'s been a while. How are you?');
  await app.send(conversationId, activity);
};
```

<!-- targeted-proactive-example -->

```typescript
import { MessageActivity, Account } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
// ...

const sendTargetedProactiveNotification = async (userId: string, recipientId: string) => {
  const conversationId = myConversationIdStorage.get(userId);
  if (!conversationId) {
    return;
  }
  
  const activity = new MessageActivity('This is a private reminder just for you!');
  activity.recipient = { id: recipientId, role: 'user' } as Account;
  
  await app.send(conversationId, activity, true);
};
```