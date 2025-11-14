<!-- example -->

<Tabs>
  <TabItem value="app.py" default>
    ```python
    from teams import App
    from teams.botbuilder import BotBuilderPlugin
    from botbuilder.core import BotFrameworkAdapter, BotFrameworkAdapterSettings
    from activity_handler import MyActivityHandler

    # Configure adapter settings
    settings = BotFrameworkAdapterSettings(
        app_id=os.environ.get("MicrosoftAppId", ""),
        app_password=os.environ.get("MicrosoftAppPassword", ""),
        app_tenant_id=os.environ.get("MicrosoftAppTenantId", "")
    )

    # Create adapter and handler
    # highlight-start
    adapter = BotFrameworkAdapter(settings)
    handler = MyActivityHandler()
    # highlight-end

    # Create Teams App with BotBuilder plugin
    # highlight-next-line
    app = App(plugins=[BotBuilderPlugin(adapter=adapter, handler=handler)])

    @app.on_message
    async def on_message(context):
        await context.send("hi from teams...")

    app.start()
    ```

  </TabItem>
  <TabItem value="activity_handler.py">
    ```python
    from botbuilder.core import TeamsActivityHandler, TurnContext

    # replace with your TeamsActivityHandler
    # highlight-start
    class MyActivityHandler(TeamsActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
            await turn_context.send_activity("hi from botbuilder...")
    # highlight-end
    ```

  </TabItem>
</Tabs>

```
hi from botbuilder...
hi from teams...
```
