<!-- content -->

BotBuilder exposes a static class `TeamsInfo` that allows you to query the api. In Teams SDK
we pass an instance of our `ApiClient` into all our activity handlers.

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
  ```python
  # highlight-error-start
-  from botbuilder.core import BotFrameworkAdapter, TurnContext
-  from botbuilder.core.teams import TeamsInfo
  # highlight-error-end
  # highlight-success-line
+  from teams import App

  # highlight-error-start
-  adapter = BotFrameworkAdapter(settings)
  # highlight-error-end
  # highlight-success-line
+  app = App()

  # highlight-error-start
-  class MyActivityHandler(TeamsActivityHandler):
-      async def on_message_activity(self, turn_context: TurnContext):
-          members = await TeamsInfo.get_members(turn_context)
  # highlight-error-end
  # highlight-success-start
+  @app.on_message
+  async def on_message(context):
+      members = await context.api.conversations.members(context.activity.conversation.id).get()
  # highlight-success-end
  ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import BotFrameworkAdapter, TurnContext
    from botbuilder.core.teams import TeamsInfo

    adapter = BotFrameworkAdapter(settings)

    class MyActivityHandler(TeamsActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
            # highlight-next-line
            members = await TeamsInfo.get_members(turn_context)
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    from teams import App

    app = App()

    @app.on_message
    async def on_message(context):
        # highlight-next-line
        members = await context.api.conversations.members(context.activity.conversation.id).get()
    ```
  </TabItem>
</Tabs>
