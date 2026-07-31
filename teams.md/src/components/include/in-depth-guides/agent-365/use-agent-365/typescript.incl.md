<!-- reactive -->

```typescript
import { getAgenticUser } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';

const app = new App();

app.on('message', async ({ activity, reply }) => {
  const agenticUser = getAgenticUser(activity.recipient);
  if (!agenticUser) {
    throw new Error('The activity is not addressed to an Agentic User.');
  }

  await reply(
    `Hi! I'm an Agentic User, and my user ID is ${agenticUser.agenticUserId}. Nice to meet you!`
  );
});
```

<!-- reaction -->

```typescript
app.on('message', async ({ activity, api }) => {
  await api.reactions.add(activity.conversation.id, activity.id, 'like');
});
```

<!-- proactive -->

```typescript
const agenticUser = app.getAgenticUser(agenticAppInstanceId, agenticUserId, { tenantId });

await app.send(conversationId, 'Your scheduled update is ready.', {
  agenticIdentity: agenticUser,
});

const api = app.api.fromAgenticIdentity({
  agenticIdentity: agenticUser,
});

await api.reactions.add(conversationId, activityId, 'like');
```
