<!-- examples -->

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-   from botbuilder.core import TeamsActivityHandler, TurnContext

-   class MyActivityHandler(TeamsActivityHandler):
-       async def on_message_activity(self, turn_context: TurnContext):
-           await turn_context.send_activity(Activity(type="typing"))
    # highlight-error-end
    # highlight-success-start
+   @app.on_message
+   async def on_message(context):
+       await context.send(Activity(type="typing"))
    # highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import TeamsActivityHandler, TurnContext

    class MyActivityHandler(TeamsActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
            # highlight-next-line
            await turn_context.send_activity(Activity(type="typing"))
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    @app.on_message
    async def on_message(context):
        # highlight-next-line
        await context.send(Activity(type="typing"))
    ```
  </TabItem>
</Tabs>

## Strings

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-   from botbuilder.core import TeamsActivityHandler, TurnContext

-   class MyActivityHandler(TeamsActivityHandler):
-       async def on_message_activity(self, turn_context: TurnContext):
-           await turn_context.send_activity("hello world")
    # highlight-error-end
    # highlight-success-start
+   @app.on_message
+   async def on_message(context):
+       await context.send("hello world")
    # highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import TeamsActivityHandler, TurnContext

    class MyActivityHandler(TeamsActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
            # highlight-next-line
            await turn_context.send_activity("hello world")
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    @app.on_message
    async def on_message(context):
        # highlight-next-line
        await context.send("hello world")
    ```
  </TabItem>
</Tabs>

## Adaptive Cards

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-line
-   from botbuilder.core import TeamsActivityHandler, TurnContext
-   from botbuilder.schema import Attachment
    # highlight-success-line
+   from teams.cards import AdaptiveCard, TextBlock

    # highlight-error-start
-   class MyActivityHandler(TeamsActivityHandler):
-       async def on_message_activity(self, turn_context: TurnContext):
-           card = {
-               "type": "AdaptiveCard",
-               "version": "1.0",
-               "body": [
-                   {"type": "TextBlock", "text": "hello world"}
-               ]
-           }
-           attachment = Attachment(
-               content_type="application/vnd.microsoft.card.adaptive",
-               content=card
-           )
-           activity = Activity(
-               type="message",
-               attachments=[attachment]
-           )
-           await turn_context.send_activity(activity)
    # highlight-error-end
    # highlight-success-start
+   @app.on_message
+   async def on_message(context):
+       await context.send(AdaptiveCard(TextBlock("hello world")))
    # highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import TeamsActivityHandler, TurnContext
    from botbuilder.schema import Attachment

    class MyActivityHandler(TeamsActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
            # highlight-start
            card = {
                "type": "AdaptiveCard",
                "version": "1.0",
                "body": [
                    {"type": "TextBlock", "text": "hello world"}
                ]
            }
            attachment = Attachment(
                content_type="application/vnd.microsoft.card.adaptive",
                content=card
            )
            activity = Activity(
                type="message",
                attachments=[attachment]
            )
            await turn_context.send_activity(activity)
            # highlight-end
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    from teams.cards import AdaptiveCard, TextBlock

    @app.on_message
    async def on_message(context):
        # highlight-next-line
        await context.send(AdaptiveCard(TextBlock("hello world")))
    ```
  </TabItem>
</Tabs>

## Attachments

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-line
-   from botbuilder.core import TeamsActivityHandler, TurnContext
-   from botbuilder.schema import Attachment, Activity
    # highlight-success-line
+   from teams.schema import MessageActivity, Attachment

    # highlight-error-start
-   class MyActivityHandler(TeamsActivityHandler):
-       async def on_message_activity(self, turn_context: TurnContext):
-           attachment = Attachment(...)
-           activity = Activity(type="message", attachments=[attachment])
-           await turn_context.send_activity(activity)
    # highlight-error-end
    # highlight-success-start
+   @app.on_message
+   async def on_message(context):
+       activity = MessageActivity()
+       activity.add_attachment(Attachment(...))
+       await context.send(activity)
    # highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import TeamsActivityHandler, TurnContext
    from botbuilder.schema import Attachment, Activity

    class MyActivityHandler(TeamsActivityHandler):
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
    from teams.schema import MessageActivity, Attachment

    @app.on_message
    async def on_message(context):
        # highlight-start
        activity = MessageActivity()
        activity.add_attachment(Attachment(...))
        await context.send(activity)
        # highlight-end
    ```
  </TabItem>
</Tabs>
