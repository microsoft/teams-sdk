<!-- identity-shape -->

```typescript
import type { AgenticUser } from '@microsoft/teams.api';

const identity: AgenticUser = {
  agenticAppInstanceId: '<agentic-app-instance-id>',
  agenticUserId: '<agentic-user-id>',
  tenantId: '<tenant-id>',
  agenticBlueprintId: '<blueprint-client-id>',
};
```

<!-- minimal-application -->

```typescript
import { App } from '@microsoft/teams.apps';

const app = new App();

app.on('message', async ({ activity, send }) => {
  const agenticUserId = activity.recipient.agenticUserId;
  await send(`Message received by Agentic User ${agenticUserId}.`);
});

app.start();
```
