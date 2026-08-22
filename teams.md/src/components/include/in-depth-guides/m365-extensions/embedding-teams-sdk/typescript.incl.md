<!-- install -->

```bash
npm install @microsoft/teams.m365extensions
```

<!-- wiring -->

```typescript
import {
  AgentApplication,
  CloudAdapter,
  getAuthConfigWithDefaults,
  MemoryStorage,
} from '@microsoft/agents-hosting';
import { useTeamsSdk } from '@microsoft/teams.m365extensions';

const authConfig = getAuthConfigWithDefaults({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
});
const adapter = new CloudAdapter(authConfig);

// Your existing Agents SDK app, unchanged.
const agentApp = new AgentApplication({ storage: new MemoryStorage(), adapter });

// Borrows agentApp's identity/token provider and installs the routing middleware.
const teamsApp = useTeamsSdk(agentApp, adapter.connectionManager);

// Register Teams SDK routes as usual.
teamsApp.message(/^help$/i, async ({ send }) => {
  await send('This reply is handled entirely by the Teams SDK.');
});
```

<!-- is-teams-channel -->

```typescript
import { isTeamsChannel } from '@microsoft/teams.m365extensions';

agentApp.onMessage(/^channel$/i, async (context) => {
  const via = isTeamsChannel(context.activity)
    ? 'Teams turn, no matching route'
    : 'non-Teams channel';
  await context.sendActivity(`channelId=${context.activity.channelId} (${via})`);
});
```

<!-- bypass -->

```typescript
import { ActivityTypes } from '@microsoft/agents-activity';
import type { TurnContext } from '@microsoft/agents-hosting';

function agentSdkOwnsSignIn(context: TurnContext): boolean {
  return (
    context.activity.type === ActivityTypes.Invoke &&
    (context.activity.name ?? '').toLowerCase().startsWith('signin/')
  );
}

// signin/* invokes always stay on the Agents SDK auth pipeline.
const teamsApp = useTeamsSdk(agentApp, adapter.connectionManager, {}, agentSdkOwnsSignIn);
```

<!-- host-context -->

Inside a Teams SDK handler you can reach the host app's `TurnContext` with `agentSdkContext()`, for the duration of a turn the middleware bridged to the Teams SDK. This is the escape hatch for host-only facilities — such as the Agents SDK's own authorization handlers or state — that the Teams SDK context doesn't model:

```typescript
import { agentSdkContext } from '@microsoft/teams.m365extensions';

teamsApp.message(/^whoami$/i, async ({ send }) => {
  // Only valid during a turn the middleware bridged to the Teams SDK.
  const hostContext = agentSdkContext();
  const token = await agentApp.authorization.getToken(hostContext, 'graphuser');
  await send(token?.token ? 'Signed in.' : 'Not signed in yet.');
});
```

`agentSdkContext()` throws when called outside a bridged turn — for example, from a detached background task or outside the request lifecycle.
