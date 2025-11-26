<!-- examples -->

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-   from botbuilder.core import ActivityHandler, TurnContext
-   from botbuilder.schema import Activity
    # highlight-error-end
    # highlight-success-start
+   from microsoft.teams.api import MessageActivity, TypingActivityInput
+   from microsoft.teams.apps import ActivityContext, App
    # highlight-success-end

    # highlight-error-start
-   class MyActivityHandler(ActivityHandler):
-       async def on_message_activity(self, turn_context: TurnContext):
-           await turn_context.send_activity(Activity(type="typing"))
    # highlight-error-end
    # highlight-success-start
+   @app.on_message
+   async def on_message(context: ActivityContext[MessageActivity]):
+       await context.send(TypingActivityInput())
    # highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import ActivityHandler, TurnContext
    from botbuilder.schema import Activity

    class MyActivityHandler(ActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
            # highlight-next-line
            await turn_context.send_activity(Activity(type="typing"))
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    from microsoft.teams.api import MessageActivity, TypingActivityInput
    from microsoft.teams.apps import ActivityContext, App

    @app.on_message
    async def on_message(context: ActivityContext[MessageActivity]):
        # highlight-next-line
        await context.send(TypingActivityInput())
    ```
  </TabItem>
</Tabs>

## Strings

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-   from botbuilder.core import ActivityHandler, TurnContext
    # highlight-error-end
    # highlight-success-start
+   from microsoft.teams.api import MessageActivity
+   from microsoft.teams.apps import ActivityContext, App
    # highlight-success-end

    # highlight-error-start
-   class MyActivityHandler(ActivityHandler):
-       async def on_message_activity(self, turn_context: TurnContext):
-           await turn_context.send_activity("hello world")
    # highlight-error-end
    # highlight-success-start
+   @app.on_message
+   async def on_message(context: ActivityContext[MessageActivity]):
+       await context.send("hello world")
    # highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import ActivityHandler, TurnContext

    class MyActivityHandler(ActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
            # highlight-next-line
            await turn_context.send_activity("hello world")
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    from microsoft.teams.api import MessageActivity
    from microsoft.teams.apps import ActivityContext, App

    @app.on_message
    async def on_message(context: ActivityContext[MessageActivity]):
        # highlight-next-line
        await context.send("hello world")
    ```
  </TabItem>
</Tabs>

## Adaptive Cards

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-   from botbuilder.core import ActivityHandler, TurnContext
-   from botbuilder.schema import Activity, Attachment
    # highlight-error-end
    # highlight-success-start
+   from microsoft.teams.api import MessageActivity
+   from microsoft.teams.apps import ActivityContext, App
+   from microsoft.teams.cards import AdaptiveCard, TextBlock
    # highlight-success-end

    # highlight-error-start
-   class MyActivityHandler(ActivityHandler):
-       async def on_message_activity(self, turn_context: TurnContext):
-         card = {"type": "AdaptiveCard", "version": "1.0", "body": [{"type": "TextBlock", "text": "hello world"}]}
-         attachment = Attachment(content_type="application/vnd.microsoft.card.adaptive", content=card)
-         activity = Activity(type="message", attachments=[attachment])
-         await turn_context.send_activity(activity)
    # highlight-error-end
    # highlight-success-start
+   @app.on_message
+   async def on_message(context: ActivityContext[MessageActivity]):
+       await context.send(AdaptiveCard().with_body([TextBlock(text="Hello from Adaptive Card!")]))
    # highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import ActivityHandler, TurnContext
    from botbuilder.schema import Activity, Attachment

    class MyActivityHandler(ActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
          # hightlight-start
          card = {"type": "AdaptiveCard", "version": "1.0", "body": [{"type": "TextBlock", "text": "hello world"}]}
          attachment = Attachment(content_type="application/vnd.microsoft.card.adaptive", content=card)
          activity = Activity(type="message", attachments=[attachment])
          await turn_context.send_activity(activity)
          # highlight-end
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    from microsoft.teams.api import MessageActivity
    from microsoft.teams.apps import ActivityContext, App
    from microsoft.teams.cards import AdaptiveCard, TextBlock

    @app.on_message
    async def on_message(context: ActivityContext[MessageActivity]):
        # highlight-next-line
        await context.send(AdaptiveCard(body=[TextBlock(text="Hello from Adaptive Card!")]))
    ```
  </TabItem>
</Tabs>

## Attachments

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-   from botbuilder.core import ActivityHandler, TurnContext
-   from botbuilder.schema import Activity, Attachment
    # highlight-error-end
    # highlight-success-start
+   from microsoft.teams.api import Attachment, MessageActivity, MessageActivityInput
+   from microsoft.teams.apps import ActivityContext, App
    # highlight-success-end

    # highlight-error-start
-   class MyActivityHandler(ActivityHandler):
-       async def on_message_activity(self, turn_context: TurnContext):
-         attachment = Attachment(...)
-         activity = Activity(type="message", attachments=[attachment])
-         await turn_context.send_activity(activity)
    # highlight-error-end
    # highlight-success-start
+   @app.on_message
+   async def on_message(context: ActivityContext[MessageActivity]):
+       attachment = Attachment(...)
+       activity = MessageActivityInput().add_attachments([attachment])
+       await context.send(activity)
    # highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import ActivityHandler, TurnContext
    from botbuilder.schema import Activity, Attachment

    class MyActivityHandler(ActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
            # highlight-start
            attachment = Attachment(...)
            activity = Activity(type="message", attachments=[attachment])
            await turn_context.send_activity(activity)
            # highlight-end
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    from microsoft.teams.api import Attachment, MessageActivity, MessageActivityInput
    from microsoft.teams.apps import ActivityContext, App

    @app.on_message
    async def on_message(context: ActivityContext[MessageActivity]):
        # highlight-start
        attachment = Attachment(...)
        activity = MessageActivityInput().add_attachments([attachment])
        await context.send(activity)
        # highlight-end
    ```
  </TabItem>
</Tabs>
