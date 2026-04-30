<!-- configuration -->

```python
from microsoft_teams.api.auth.cloud_environment import US_GOV
from microsoft_teams.apps import App

app = App(cloud=US_GOV)
```

**Available cloud presets:** `PUBLIC`, `US_GOV`, `US_GOV_DOD`, `CHINA`

<!-- per-endpoint-overrides -->

```python
from microsoft_teams.api.auth.cloud_environment import CHINA, with_overrides
from microsoft_teams.apps import App

app = App(cloud=with_overrides(CHINA, login_tenant="your-tenant-id"))
```

<!-- troubleshooting-china-tenant -->

```python
from microsoft_teams.api.auth.cloud_environment import CHINA, with_overrides
from microsoft_teams.apps import App

app = App(cloud=with_overrides(CHINA, login_tenant="your-tenant-id"))
```
