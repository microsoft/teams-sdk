<!-- setup -->

Install the M365 Extensions package alongside the Microsoft Agents SDK:

```bash
npm install @microsoft/teams.m365extensions
```

Add an Agents SDK host to your existing Teams SDK application, then replace your current `App` initialization with `useTeamsSdk`:

```typescript
import {
  AgentApplication,
  CloudAdapter,
  getAuthConfigWithDefaults,
  MemoryStorage,
  type TurnState,
} from '@microsoft/agents-hosting';
import { useTeamsSdk } from '@microsoft/teams.m365extensions';

const authConfig = getAuthConfigWithDefaults({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
});

const adapter = new CloudAdapter(authConfig);
const agentApp = new AgentApplication<TurnState>({
  storage: new MemoryStorage(),
  adapter,
});

const app = useTeamsSdk(agentApp, adapter.connectionManager);
```

<!-- targeted-message -->

```typescript
import { MessageActivityInput } from '@microsoft/teams.api';

app.message(/^targeted$/i, async ({ send, activity }) => {
  const sender = activity.from;
  const targetedMessage = new MessageActivityInput(
    'This message is only visible to you.'
  ).withRecipient(
    { id: sender.id, name: sender.name ?? '', role: 'user' },
    true
  );

  await send(targetedMessage);
});
```

<!-- targeted-message-sample-link -->

[TypeScript targeted messages sample](https://github.com/microsoft/teams.ts/tree/main/examples/targeted-messages)

<!-- agents-sdk-reaction -->

```typescript
import { isTeamsChannel } from '@microsoft/teams.m365extensions';

agentApp.onMessage(/^agents sdk react$/i, async (context) => {
  if (!isTeamsChannel(context.activity)) {
    await context.sendActivity('Message reactions are only available in Teams.');
    return;
  }

  const response = await context.sendActivity('Adding then removing a reaction.');
  const api = app.api.fromServiceUrl({
    serviceUrl: context.activity.serviceUrl!,
  });
  const conversationId = context.activity.conversation!.id;

  await api.conversations.addReaction(conversationId, response!.id!, 'like');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await api.conversations.deleteReaction(conversationId, response!.id!, 'like');
});
```

<!-- m365-extensions-sample-link -->

[TypeScript M365 Extensions sample](https://github.com/microsoft/teams.ts/tree/main/examples/m365extensions)