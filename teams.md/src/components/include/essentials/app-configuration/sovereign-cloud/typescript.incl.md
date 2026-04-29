<!-- configuration -->

```typescript
import { App } from '@microsoft/teams.apps';
import { US_GOV } from '@microsoft/teams.api';

const app = new App({
  cloud: US_GOV,
});
```

**Available cloud presets:** `PUBLIC`, `US_GOV`, `US_GOV_DOD`, `CHINA`

<!-- per-endpoint-overrides -->

```typescript
import { App } from '@microsoft/teams.apps';
import { CHINA, withOverrides } from '@microsoft/teams.api';

const app = new App({
  cloud: withOverrides(CHINA, { loginTenant: 'your-tenant-id' }),
});
```

<!-- troubleshooting-china-tenant -->

```typescript
import { App } from '@microsoft/teams.apps';
import { CHINA, withOverrides } from '@microsoft/teams.api';

const app = new App({
  cloud: withOverrides(CHINA, { loginTenant: 'your-tenant-id' }),
});
```
