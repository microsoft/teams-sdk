---
sidebar_position: 2
summary: Guide to implementing custom logging in Python Teams SDK applications using the ConsoleLogger and custom logger options.
---

# 🗃️ Custom Logger

The `App` will provide a default logger, but you can also provide your own.
The default `Logger` instance will be set to `ConsoleLogger` from the
`microsoft-teams-common` package.


```python
import asyncio

from microsoft.teams.api import MessageActivity
from microsoft.teams.api.activities.typing import TypingActivityInput
from microsoft.teams.apps import ActivityContext, App
from microsoft.teams.common import ConsoleLogger, ConsoleLoggerOptions

logger = ConsoleLogger().create_logger("echo", ConsoleLoggerOptions(level="debug"))
app = App(logger=logger)

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    logger.debug(ctx.activity)
    await ctx.reply(TypingActivityInput())
    await ctx.send(f"You said '{ctx.activity.text}'")


if __name__ == "__main__":
    asyncio.run(app.start())

```

