<!-- method-name -->

`send`

<!-- param-name -->

`conversation_id`

<!-- context-name -->

`ActivityContext`

<!-- example -->

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-   from botbuilder.core import TurnContext
-   from botbuilder.integration.aiohttp import CloudAdapter, ConfigurationBotFrameworkAuthentication
-   from botbuilder.schema import ChannelAccount, ConversationAccount, ConversationReference
    # highlight-error-end
    # highlight-success-line
+   from microsoft.teams.apps import App

    # highlight-error-start
-   adapter = CloudAdapter(ConfigurationBotFrameworkAuthentication(config))
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
-   )
    # highlight-error-end
    # highlight-success-start
+   await app.send("your-conversation-id", "proactive hello")
    # highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import TurnContext
    from botbuilder.integration.aiohttp import CloudAdapter, ConfigurationBotFrameworkAuthentication
    from botbuilder.schema import ChannelAccount, ConversationAccount, ConversationReference

    adapter = CloudAdapter(ConfigurationBotFrameworkAuthentication(config))

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
        send_proactive
    )
    # highlight-end
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    from microsoft.teams.apps import App

    app = App()

    # highlight-start
    await app.send("your-conversation-id", "proactive hello")
    # highlight-end
    ```
  </TabItem>
</Tabs>
