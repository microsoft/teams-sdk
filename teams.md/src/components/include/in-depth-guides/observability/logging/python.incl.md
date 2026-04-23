<!-- default-logger -->

Python's standard `logging` module (configured with `ConsoleFormatter` from the SDK).

<!-- package-name -->

`microsoft-teams-common`

<!-- custom-logger-example -->

The Python SDK writes to the standard `logging` module. Configure a handler and formatter at startup:

```python
import asyncio
import logging

from microsoft_teams.api import MessageActivity
from microsoft_teams.apps import ActivityContext, App
from microsoft_teams.common import ConsoleFormatter

# Setup logging
logging.getLogger().setLevel(logging.DEBUG)
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(ConsoleFormatter())
logging.getLogger().addHandler(stream_handler)
logger = logging.getLogger(__name__)

app = App()


@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    logger.debug(ctx.activity)
    await ctx.send(f"You said '{ctx.activity.text}'")


if __name__ == "__main__":
    asyncio.run(app.start())
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

<!-- env-vars -->

The Python SDK does not read logging environment variables on its own. If you want `LOG_LEVEL` to control verbosity, read it yourself at startup:

```python
import os
logging.getLogger().setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
```
