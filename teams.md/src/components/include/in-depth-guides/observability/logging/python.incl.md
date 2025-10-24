<!-- default-logger -->

`ConsoleLogger`

<!-- package-name -->

`microsoft-teams-common`

<!-- custom-logger-example -->

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
