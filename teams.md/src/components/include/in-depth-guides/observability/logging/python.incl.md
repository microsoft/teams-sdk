<!-- default-logger -->

Python's standard `logging` module (`logging.getLogger(__name__)` per module).

<!-- package-name -->

`microsoft-teams-common`

<!-- custom-logger-example -->

The Python SDK uses standard `logging` — there's no custom logger to inject into `App`. To see SDK log output, attach a handler to the `microsoft_teams` logger hierarchy. The SDK ships a `ConsoleFormatter` with color-coded output if you want it:

```python
import logging
import os
from microsoft_teams.common import ConsoleFormatter

handler = logging.StreamHandler()
handler.setFormatter(ConsoleFormatter())
logging.getLogger("microsoft_teams").addHandler(handler)
logging.getLogger("microsoft_teams").setLevel(
    os.getenv("LOG_LEVEL", "INFO").upper()
)
```

<!-- log-levels -->

Python's standard `logging` levels apply: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`.

<!-- pattern-example -->

Use `ConsoleFilter` to limit which loggers emit, matched by name with `*` wildcards:

```python
from microsoft_teams.common import ConsoleFilter, ConsoleFormatter

handler = logging.StreamHandler()
handler.setFormatter(ConsoleFormatter())
handler.addFilter(ConsoleFilter("microsoft_teams*"))  # only SDK loggers
logging.getLogger().addHandler(handler)
```

<!-- child-logger -->

N/A

<!-- env-vars -->

The Python SDK does not read logging environment variables on its own. If you want `LOG_LEVEL` to control verbosity, read it yourself at startup:

```python
import os
logging.getLogger().setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
```
