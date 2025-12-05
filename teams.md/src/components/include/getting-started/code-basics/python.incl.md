<!-- imports -->

N/A

<!-- project-structure -->

```
quote-agent/
|── appPackage/       # Teams app package files
├── src
    ├── main.py       # Main application code
```

<!-- project-structure-description -->

- **appPackage/**: Contains the Teams app package files, including the `manifest.json` file and icons. This is required for [sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) the app into Teams for testing. The app manifest defines the app's metadata, capabilities, and permissions.
- **src/**: Contains the main application code. The `main.py` file is the entry point for your application.

<!-- app-class-code -->

```python title="src/main.py"
from microsoft_teams.api import MessageActivity, TypingActivityInput
from microsoft_teams.apps import ActivityContext, App, AppOptions
from microsoft_teams.devtools import DevToolsPlugin

app = App(plugins=[DevToolsPlugin()])

```

<!-- plugin-events -->

(on_activity, on_activity_sent, etc.)

<!-- message-handling-code -->

```python title="src/main.py"
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    await ctx.reply(TypingActivityInput())

    if "reply" in ctx.activity.text.lower():
        await ctx.reply("Hello! How can I assist you today?")
    else:
        await ctx.send(f"You said '{ctx.activity.text}'")
```

<!-- message-handling-step1 -->

Listens for all incoming messages using `app.on_message`

<!-- message-handling-step3 -->

Responds by echoing back the received message if any other text aside from "reply" is sent.

<!-- message-handling-info -->

:::info
Python uses type hints for better development experience. You can change the activity handler to different supported activities, and the type system will provide appropriate hints and validation.
:::

<!-- app-lifecycle-code -->

```python
if __name__ == "__main__":
    asyncio.run(app.start())
```
