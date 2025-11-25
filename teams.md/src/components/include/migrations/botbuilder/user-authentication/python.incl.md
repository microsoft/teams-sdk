<!-- example -->

<Tabs groupId="user-auth">
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-   from botbuilder.core import (
-       ActivityHandler,
-       ConversationState,
-       UserState,
-       MemoryStorage,
-       BotFrameworkAdapter
-   )
-   from botbuilder.dialogs import (
-       ComponentDialog,
-       OAuthPrompt,
-       OAuthPromptSettings,
-       WaterfallDialog,
-       WaterfallStepContext,
-       DialogSet,
-       DialogTurnStatus
-   )
    # highlight-error-end
    # highlight-success-start
+   from microsoft.teams.apps import ActivityContext, App, SignInEvent
+   from microsoft.teams.api import MessageActivity
    # highlight-success-end

    # highlight-error-start
-   class MyActivityHandler(ActivityHandler):
-       def __init__(self, connection_name: str, conversation_state: ConversationState, user_state: UserState):
-           super().__init__()
-           self.conversation_state = conversation_state
-           self.user_state = user_state
-           self.dialog = SignInDialog("signin", connection_name)
-           self.dialog_state = self.conversation_state.create_property("DialogState")
-
-       async def on_message_activity(self, turn_context: TurnContext):
-           await self.dialog.run(turn_context, self.dialog_state)
-
-       async def on_turn(self, turn_context: TurnContext):
-           await super().on_turn(turn_context)
-           await self.conversation_state.save_changes(turn_context)
-           await self.user_state.save_changes(turn_context)
    # highlight-error-end

    # highlight-error-start
-   class SignInDialog(ComponentDialog):
-       def __init__(self, dialog_id: str, connection_name: str):
-           super().__init__(dialog_id)
-           self.connection_name = connection_name
-
-           self.add_dialog(OAuthPrompt(
-               "OAuthPrompt",
-               OAuthPromptSettings(
-                   connection_name=connection_name,
-                   text="Please Sign In",
-                   title="Sign In",
-                   timeout=300000
-               )
-           ))
-
-           self.add_dialog(WaterfallDialog(
-               "Main",
-               [self.prompt_step, self.login_step]
-           ))
-
-           self.initial_dialog_id = "Main"
-
-       async def prompt_step(self, step_context: WaterfallStepContext):
-           return await step_context.begin_dialog("OAuthPrompt")
-
-       async def login_step(self, step_context: WaterfallStepContext):
-           await step_context.context.send_activity("You have been signed in.")
-           return await step_context.end_dialog()
-
-       async def run(self, turn_context: TurnContext, accessor):
-           dialog_set = DialogSet(accessor)
-           dialog_set.add(self)
-
-           dialog_context = await dialog_set.create_context(turn_context)
-           results = await dialog_context.continue_dialog()
-
-           if results.status == DialogTurnStatus.Empty:
-               await dialog_context.begin_dialog(self.id)
    # highlight-error-end

    # highlight-error-start
-   adapter = BotFrameworkAdapter(settings)
-   storage = MemoryStorage()
-   conversation_state = ConversationState(storage)
-   user_state = UserState(storage)
-   handler = MyActivityHandler(
-       connection_name,
-       conversation_state,
-       user_state
-   )
    # highlight-error-end
    # highlight-success-start
+   app = App(default_connection_name=connection_name)
+
+   @app.on_message_pattern("/signout")
+   async def on_signout(context: ActivityContext[MessageActivity]):
+       if not context.is_signed_in:
+           return
+       await context.sign_out()
+       await context.send("You have been signed out.")
+
+   @app.on_message
+   async def on_message(context: ActivityContext[MessageActivity]):
+       if not context.is_signed_in:
+           await context.sign_in()
+           return
+
+   @app.event("sign_in")
+   async def on_signin(event: SignInEvent):
+       await event.activity_ctx.send("You have been signed in.")
    # highlight-success-end
    ```

  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import (
        ActivityHandler,
        ConversationState,
        UserState,
        MemoryStorage,
        BotFrameworkAdapter
    )
    from botbuilder.dialogs import (
        ComponentDialog,
        OAuthPrompt,
        OAuthPromptSettings,
        WaterfallDialog,
        WaterfallStepContext,
        DialogSet,
        DialogTurnStatus
    )

    class MyActivityHandler(ActivityHandler):
        def __init__(self, connection_name: str, conversation_state: ConversationState, user_state: UserState):
            super().__init__()
            self.conversation_state = conversation_state
            self.user_state = user_state
            self.dialog = SignInDialog("signin", connection_name)
            self.dialog_state = self.conversation_state.create_property("DialogState")

        async def on_message_activity(self, turn_context: TurnContext):
            await self.dialog.run(turn_context, self.dialog_state)

        async def on_turn(self, turn_context: TurnContext):
            await super().on_turn(turn_context)
            await self.conversation_state.save_changes(turn_context)
            await self.user_state.save_changes(turn_context)

    class SignInDialog(ComponentDialog):
        def __init__(self, dialog_id: str, connection_name: str):
            super().__init__(dialog_id)
            self.connection_name = connection_name

            self.add_dialog(OAuthPrompt(
                "OAuthPrompt",
                OAuthPromptSettings(
                    connection_name=connection_name,
                    text="Please Sign In",
                    title="Sign In",
                    timeout=300000
                )
            ))

            self.add_dialog(WaterfallDialog(
                "Main",
                [self.prompt_step, self.login_step]
            ))

            self.initial_dialog_id = "Main"

        async def prompt_step(self, step_context: WaterfallStepContext):
            return await step_context.begin_dialog("OAuthPrompt")

        async def login_step(self, step_context: WaterfallStepContext):
            await step_context.context.send_activity("You have been signed in.")
            return await step_context.end_dialog()

        async def run(self, turn_context: TurnContext, accessor):
            dialog_set = DialogSet(accessor)
            dialog_set.add(self)

            dialog_context = await dialog_set.create_context(turn_context)
            results = await dialog_context.continue_dialog()

            if results.status == DialogTurnStatus.Empty:
                await dialog_context.begin_dialog(self.id)

    storage = MemoryStorage()
    conversation_state = ConversationState(storage)
    user_state = UserState(storage)
    handler = MyActivityHandler(
        connection_name,
        conversation_state,
        user_state
    )
    ```

  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    from microsoft.teams.apps import ActivityContext, App, SignInEvent
    from microsoft.teams.api import MessageActivity

    app = App(default_connection_name=connection_name)

    @app.on_message_pattern("/signout")
    async def on_signout(context: ActivityContext[MessageActivity]):
        if not context.is_signed_in:
            return
        await context.sign_out()
        await context.send("You have been signed out.")

    @app.on_message
    async def on_message(context: ActivityContext[MessageActivity]):
        if not context.is_signed_in:
            await context.sign_in()
            return

    @app.event("sign_in")
    async def on_signin(event: SignInEvent):
        await context.send("You have been signed in.")
    ```

  </TabItem>
</Tabs>
