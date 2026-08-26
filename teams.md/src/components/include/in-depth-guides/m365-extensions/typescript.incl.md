<!-- setup -->

Install the M365 Extensions package alongside the Microsoft Agents SDK:

```bash
npm install @microsoft/agents-hosting @microsoft/teams.m365extensions
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

<!-- channel-routing -->

```typescript
AGENT_SDK_APP.onMessage(command('channel'), async (context: TurnContext) => {
  const via = isTeamsChannel(context.activity)
    ? 'Teams turn with no matching teams.ts route → fell through'
    : 'non-Teams channel → passed straight through';
  await context.sendActivity(`[Agent SDK] channelId=${context.activity.channelId} (${via})`);
});
```

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
