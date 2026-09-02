<!-- reactive -->

```typescript
import { getAgenticIdentity } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';

const app = new App();

app.on('message', async ({ activity, reply }) => {
  const agenticIdentity = getAgenticIdentity(activity.recipient);
  if (!agenticIdentity?.agenticUserId) {
    throw new Error('The activity is not addressed to an Agentic User.');
  }

  await reply(
    `Hi! I'm an Agentic User, and my user ID is ${agenticIdentity.agenticUserId}. Nice to meet you!`
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
const agenticIdentity = app.getAgenticIdentity({
  agenticAppId,
  agenticUserId,
});

await app.send(conversationId, 'Your scheduled update is ready.', {
  agenticIdentity,
});

const api = app.api.forAgenticIdentity(agenticIdentity);

await api.reactions.add(conversationId, activityId, 'like');
```
