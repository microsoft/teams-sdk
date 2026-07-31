<!-- reactive-observability -->

```typescript
import { App } from '@microsoft/teams.apps';

const agent365 = {
  operationSource: 'support-agent',
  // Identifiers are included by default. Extra data is opt-in.
  include: ['agentName'],
} as const;

const app = new App({
  telemetry: { agent365 },
});
```

<!-- exporter-auth -->

```typescript
const observabilityScope = 'api://9b975845-388f-4429-889e-eab1ef63949c/.default';

const token = await app.tokenProvider.getAgenticAppInstanceToken(
  observabilityScope,
  agenticUser.agenticAppInstanceId,
  tenantId
);
```

<!-- proactive-observability -->

```typescript
import { createAgent365Scope } from '@microsoft/teams.apps';

const withAgent365Scope = createAgent365Scope(agent365);

await withAgent365Scope({ agenticIdentity: agenticUser, conversationId }, async () => {
  // Create the Agent 365 operation span inside this callback.
  await app.send(conversationId, 'Digest ready.', {
    agenticIdentity: agenticUser,
  });
});
```
