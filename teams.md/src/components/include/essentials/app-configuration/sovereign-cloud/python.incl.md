<!-- configuration -->

Add the `CLOUD` environment variable to your existing app authentication configuration. This works alongside any auth method (client secret, managed identity, federated credentials).

```env
CLOUD=USGov
```

Valid values: `Public`, `USGov`, `USGovDoD`, `China`

You can also configure the cloud programmatically:

```python
from microsoft_teams.api.auth.cloud_environment import US_GOV
from microsoft_teams.apps import App

app = App(cloud=US_GOV)
```

**Available cloud presets:** `PUBLIC`, `US_GOV`, `US_GOV_DOD`, `CHINA`

<!-- per-endpoint-overrides -->

## Per-Endpoint Overrides

For scenarios requiring customization of individual endpoints, such as China single-tenant bots that need a tenant-specific login URL, you can override specific properties.

```python
from microsoft_teams.api.auth.cloud_environment import CHINA, with_overrides
from microsoft_teams.apps import App

app = App(cloud=with_overrides(CHINA, login_tenant="your-tenant-id"))
```
Available override properties: `LoginEndpoint`, `LoginTenant`, `BotScope`, `TokenServiceUrl`, `OpenIdMetadataUrl`, `TokenIssuer`, `GraphScope`

<!-- troubleshooting-china-tenant -->

```python
from microsoft_teams.api.auth.cloud_environment import CHINA, with_overrides
from microsoft_teams.apps import App

app = App(cloud=with_overrides(CHINA, login_tenant="your-tenant-id"))
```

<!-- troubleshooting-cloud-env-ignored -->

### `CLOUD` environment variable seems ignored

**Symptom:** The bot still uses public cloud endpoints despite setting `CLOUD=USGov`.

**Cause:** Either the env var is not set in the running process (only in your shell), or your code passes `cloud:` explicitly, which takes precedence.

**Fix:** Confirm the env var is exported into the process environment, then check whether your code passes `cloud:` explicitly. With current behavior, the value passed in code wins over the environment variable.
