<!-- example -->

<Tabs>
  <TabItem value="app.py" default>
    ```python
    import asyncio
    from adapter import adapter
    from activity_handler import MyActivityHandler
    from microsoft.teams.api import MessageActivity
    from microsoft.teams.apps import ActivityContext, App
    from microsoft.teams.botbuilder import BotBuilderPlugin

    # highlight-next-line
    app = App(plugins=[BotBuilderPlugin(adapter=adapter, handler=MyActivityHandler())])

    @app.on_message
    async def handle_message(ctx: ActivityContext[MessageActivity]):
        print("Handling message in app...")
        await ctx.send("hi from teams...")


    if __name__ == "__main__":
        asyncio.run(app.start())
    ```

  </TabItem>
  <TabItem value="adapter.py">
    ```python
    from botbuilder.core import TurnContext
    from botbuilder.integration.aiohttp import (
        CloudAdapter,
        ConfigurationBotFrameworkAuthentication,
    )
    from botbuilder.schema import Activity, ActivityTypes
    from types import SimpleNamespace
    
    config = SimpleNamespace(
                APP_TYPE="SingleTenant" if tenant_id else "MultiTenant",
                APP_ID=client_id,
                APP_PASSWORD=client_secret,
                APP_TENANTID=tenant_id,
            )

    # replace with your Adapter
    # highlight-start
    adapter = CloudAdapter(ConfigurationBotFrameworkAuthentication(config))

    async def on_error(context: TurnContext, error: Exception):
        # Send a message to the user
        await context.send_activity("The bot encountered an error or bug.")

    adapter.on_turn_error = on_error
    # highlight-end
    ```

  </TabItem>
  <TabItem value="activity_handler.py">
    ```python
    from botbuilder.core import ActivityHandler, TurnContext

    # replace with your ActivityHandler
    # highlight-start
    class MyActivityHandler(ActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
            await turn_context.send_activity("hi from botbuilder...")
    # highlight-end
    ```

  </TabItem>
</Tabs>

In this example:
- `adapter.py` defines a `CloudAdapter`, which handles incoming activities, manages errors through `on_turn_error`, and provides middleware support.
- `activity_handler.py` defines `MyActivityHandler` (inheriting from ActivityHandler) containing the core bot logic, sending responses via the `TurnContext`.
- `app.py` sets up the Teams SDK App and registers the `BotBuilderPlugin` with your adapter and activity handler. It also defines a Teams SDK handler that responds to messages.

In the output, the first line comes from the BotBuilder `ActivityHandler`.
The second line comes from the Teams SDK handler.
This demonstrates that both handlers can process the same message sequentially when using the `BotBuilderPlugin`.

```
hi from botbuilder...
hi from teams...
```
