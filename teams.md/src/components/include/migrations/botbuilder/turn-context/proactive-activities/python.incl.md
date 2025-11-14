<!-- method-name -->

`send`

<!-- param-name -->

`conversation_id`

<!-- example -->

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-   from botbuilder.core import BotFrameworkAdapter, TurnContext
-   from botbuilder.schema import ConversationReference
    # highlight-error-end
    # highlight-success-line
+   from teams import App

    # highlight-error-start
-   adapter = BotFrameworkAdapter(settings)
    # highlight-error-end
    # highlight-success-line
+   app = App()

    # highlight-error-start
-   conversation_reference = ConversationReference(
-       service_url="...",
-       bot=ChannelAccount(...),
-       channel_id="msteams",
-       conversation=ConversationAccount(...),
-       user=ChannelAccount(...)
-   )
-
-   async def send_proactive(turn_context: TurnContext):
-       await turn_context.send_activity("proactive hello")
-
-   await adapter.continue_conversation(
-       conversation_reference,
-       send_proactive,
-       app_id=settings.app_id
-   )
    # highlight-error-end
    # highlight-success-start
+   await app.start()
+   await app.send("your-conversation-id", "proactive hello")
    # highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import BotFrameworkAdapter, TurnContext
    from botbuilder.schema import ConversationReference

    adapter = BotFrameworkAdapter(settings)

    # highlight-start
    conversation_reference = ConversationReference(
        service_url="...",
        bot=ChannelAccount(...),
        channel_id="msteams",
        conversation=ConversationAccount(...),
        user=ChannelAccount(...)
    )

    async def send_proactive(turn_context: TurnContext):
        await turn_context.send_activity("proactive hello")

    await adapter.continue_conversation(
        conversation_reference,
        send_proactive,
        app_id=settings.app_id
    )
    # highlight-end
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    from teams import App

    app = App()

    # highlight-start
    await app.start()
    await app.send("your-conversation-id", "proactive hello")
    # highlight-end
    ```
  </TabItem>
</Tabs>
