<!-- environment -->

```env
CLIENT_ID=<agentic-blueprint-client-id>
CLIENT_SECRET=<agentic-blueprint-client-secret>
TENANT_ID=<tenant-id>
```

```typescript
import { App } from '@microsoft/teams.apps';

const app = new App();
```

The SDK reads the blueprint credential from the environment when the values are not passed directly to `App`.

<!-- custom-token-provider -->

```typescript
import { App } from '@microsoft/teams.apps';

const app = new App({
  clientId: '<agentic-blueprint-client-id>',
  tenantId: '<tenant-id>',
  token: async (scope, tenantId, options) => {
    if (options?.agenticUser) {
      return acquireAgenticUserToken({
        scope,
        tenantId,
        agenticUser: options.agenticUser,
      });
    }

    return acquireBlueprintToken({ scope, tenantId });
  },
});
```
