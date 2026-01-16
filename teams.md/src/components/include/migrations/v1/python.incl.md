<!-- botbuilder-adapter-note -->

We'll also discuss how you can migrate features over incrementally via the [botbuilder plugin](./botbuilder).

<!-- installation -->

First, let's install Teams SDK into your project. Notably, this won't replace any existing installation of Teams SDK. When you've completed your migration, you can safely remove the `teams-ai` dependency from your `pyproject.toml` file.

```sh
uv add microsoft-teams-apps
```

<!-- app-migration -->

<Tabs>
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-    # in api.py
-    from http import HTTPStatus
-
-    from aiohttp import web
-    from botbuilder.core.integration import aiohttp_error_middleware
-
-    from bot import app
-
-    routes = web.RouteTableDef()
-
-    @routes.post("/api/messages")
-    async def on_messages(req: web.Request) -> web.Response:
-        res = await app.process(req)
-        if res is not None:
-            return res
-        return web.Response(status=HTTPStatus.OK)
-
-    # in bot.py
-    import sys
-    import traceback
-
-    from botbuilder.core import TurnContext, MemoryStorage
-    from teams import Application, ApplicationOptions, TeamsAdapter
-    from teams.state import TurnState
-
-    config = Config()
-    storage = MemoryStorage()
-    app = Application[TurnState](
-        ApplicationOptions(
-            bot_app_id=config.APP_ID,
-            adapter=TeamsAdapter(config),
-            storage=storage
-        )
-    )
-
-    @app.activity("message")
-    async def on_message(context: TurnContext, _state: TurnState):
-        await context.send_activity(f"you said: {context.activity.text}")
-        return True
-
-    @app.error
-    async def on_error(context: TurnContext, error: Exception):
-        print(f"\n [on_turn_error] unhandled error: {error}", file=sys.stderr)
-        traceback.print_exc()
-        await context.send_activity("The bot encountered an error or bug.")
    # highlight-error-end
    # highlight-success-start
+    # in main.py
+    import asyncio
+    import logging
+
+    from microsoft_teams.api import MessageActivity
+    from microsoft_teams.apps import ActivityContext, App, ErrorEvent
+    from microsoft_teams.common import LocalStorage
+
+    logger = logging.getLogger(__name__)
+
+    # Define the app
+    app = App()
+
+    # Optionally create local storage
+    storage: LocalStorage[str] = LocalStorage()
+
+    @app.on_message
+    async def handle_message(ctx: ActivityContext[MessageActivity]):
+        await ctx.send(f"You said '{ctx.activity.text}'")
+
+    # Listen for errors
+    @app.event("error")
+    async def handle_error(event: ErrorEvent) -> None:
+        """Handle errors."""
+        logger.error(f"Error occurred: {event.error}")
+        if event.context:
+            logger.warning(f"Context: {event.context}")
+
+    if __name__ == "__main__":
+        asyncio.run(app.start())
    # highlight-success-end
    ```

  </TabItem>
  <TabItem value="v2" label="Teams SDK v2">
    ```python
    # in main.py
    import asyncio
    import logging

    from microsoft_teams.api import MessageActivity
    from microsoft_teams.apps import ActivityContext, App, ErrorEvent
    from microsoft_teams.common import LocalStorage

    logger = logging.getLogger(__name__)

    # Define the app
    app = App()

    # Optionally create local storage
    storage: LocalStorage[str] = LocalStorage()

    @app.on_message
    async def handle_message(ctx: ActivityContext[MessageActivity]):
        await ctx.send(f"You said '{ctx.activity.text}'")

    # Listen for errors
    @app.event("error")
    async def handle_error(event: ErrorEvent) -> None:
        """Handle errors."""
        logger.error(f"Error occurred: {event.error}")
        if event.context:
            logger.warning(f"Context: {event.context}")


    if __name__ == "__main__":
        asyncio.run(app.start())
    ```

  </TabItem>
  <TabItem value="v1" label="Teams SDK v1">
    ```python
    # in api.py
    from http import HTTPStatus

    from aiohttp import web
    from botbuilder.core.integration import aiohttp_error_middleware

    from bot import app

    routes = web.RouteTableDef()


    @routes.post("/api/messages")
    async def on_messages(req: web.Request) -> web.Response:
        res = await app.process(req)

        if res is not None:
            return res

        return web.Response(status=HTTPStatus.OK)


    api = web.Application(middlewares=[aiohttp_error_middleware])
    api.add_routes(routes)

    # in app.py
    from aiohttp import web

    from api import api
    from config import Config

    if __name__ == "__main__":
        web.run_app(api, host="localhost", port=Config.PORT)

    # in bot.py
    import sys
    import traceback

    from botbuilder.core import TurnContext, MemoryStorage
    from teams import Application, ApplicationOptions, TeamsAdapter
    from teams.state import TurnState

    from config import Config

    config = Config()
    storage = MemoryStorage()
    app = Application[TurnState](
        ApplicationOptions(
            bot_app_id=config.APP_ID,
            adapter=TeamsAdapter(config),
            storage=storage
        )
    )

    @app.activity("message")
    async def on_message(context: TurnContext, _state: TurnState):
        await context.send_activity(f"you said: {context.activity.text}")
        return True


    @app.error
    async def on_error(context: TurnContext, error: Exception):
        # This check writes out errors to console log .vs. app insights.
        # NOTE: In production environment, you should consider logging this to Azure
        #       application insights.
        print(f"\n [on_turn_error] unhandled error: {error}", file=sys.stderr)
        traceback.print_exc()

        # Send a message to the user
        await context.send_activity("The bot encountered an error or bug.")
    ```

  </TabItem>
</Tabs>

<!-- activity-handlers-intro -->

slightly

<!-- message-handlers -->

<Tabs>
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-    # Triggered when user sends "hi"
-    @app.message(re.compile(r"hi", re.IGNORECASE))
-    async def greeting(context: TurnContext, _state: AppTurnState) -> bool:
-        await context.send_activity("Hi there!")
-        return True
-
-    # Listens for ANY message received
-    @app.activity("message")
-    async def on_message(context: TurnContext, _state: TurnState):
-        # Echoes back what user said
-        await context.send_activity(f"you said: {context.activity.text}")
-        return True
    # highlight-error-end
    # highlight-success-start
+    # Triggered when user sends "hi", "hello", or "greetings"
+    @app.on_message_pattern(re.compile(r"hello|hi|greetings"))
+    async def handle_greeting(ctx: ActivityContext[MessageActivity]) -> None:
+        await ctx.reply("Hello! How can I assist you today?")
+
+    # Listens for ANY message received
+    @app.on_message
+    async def handle_message(ctx: ActivityContext[MessageActivity]):
+        # Sends a typing indicator
+        await ctx.reply(TypingActivityInput())
+        await ctx.send(f"You said '{ctx.activity.text}'")
    # highlight-success-end
    ```

  </TabItem>
<TabItem value="v2" label="Teams SDK v2">
    ```python
    # Triggered when user sends "hi", "hello", or "greetings"
    @app.on_message_pattern(re.compile(r"hello|hi|greetings"))
    async def handle_greeting(ctx: ActivityContext[MessageActivity]) -> None:
        await ctx.reply("Hello! How can I assist you today?")

    # Listens for ANY message received
    @app.on_message
    async def handle_message(ctx: ActivityContext[MessageActivity]):
        # Sends a typing indicator
        await ctx.reply(TypingActivityInput())
        await ctx.send(f"You said '{ctx.activity.text}'")
    ```

  </TabItem>
  <TabItem value="v1" label="Teams SDK v1">
    ```python
    # Triggered when user sends "hi"
    @app.message(re.compile(r"hi", re.IGNORECASE))
    async def greeting(context: TurnContext, _state: AppTurnState) -> bool:
        await context.send_activity("Hi there!")
        return True

    # Listens for ANY message received
    @app.activity("message")
    async def on_message(context: TurnContext, _state: TurnState):
        # Echoes back what user said
        await context.send_activity(f"you said: {context.activity.text}")
        return True
    ```

  </TabItem>
</Tabs>

<!-- task-modules-note -->

Note that on Microsoft Teams, task modules have been renamed to dialogs.

<!-- task-modules -->

<Tabs>
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-    @app.task_module.fetch("connect-account")
-    async def on_connect_account(context: TurnContext, _state: TurnState):
-        return TaskModuleTaskInfo(
-            title="Connect your Microsoft 365 account",
-            height="medium",
-            width="medium",
-            url=f"https://{config.NEXT_PUBLIC_BOT_DOMAIN}/connections",
-            fallbackUrl=f"https://{config.NEXT_PUBLIC_BOT_DOMAIN}/connections",
-            completionBotId=config.NEXT_PUBLIC_BOT_ID,
-        )
-
-    @app.task_modules.submit("connect-account")
-    async def on_submit_connect_account(context: TurnContext, _state: TurnState, data: Dict[str, Any]):
-        print(json.dumps(data))
-        await context.send_activity("You are all set! Now, how can I help you today?")
-        return None
    # highlight-error-end
    # highlight-success-start
+    @app.on_dialog_open
+    async def handle_dialog_open(ctx: ActivityContext[TaskFetchInvokeActivity]):
+        data: Optional[Any] = ctx.activity.value.data
+        dialog_type = data.get("opendialogtype") if data else None
+
+        if dialog_type == "some_type":
+             return InvokeResponse(
+                body=TaskModuleResponse(
+                    task=TaskModuleContinueResponse(
+                        value=UrlTaskModuleTaskInfo(
+                            title="Dialog title",
+                            height="medium",
+                            width="medium",
+                            url= f"https://${os.getenv("YOUR_WEBSITE_DOMAIN")}/some-path",
+                            fallback_url= f"https://${os.getenv("YOUR_WEBSITE_DOMAIN")}/fallback-path-for-web",
+                            completion_bot_id= os.getenv("ENTRA_APP_CLIENT_ID"),
+                        )
+                    )
+                )
+            )
+
+    @app.on_dialog_submit
+    async def handle_dialog_submit(ctx: ActivityContext[TaskSubmitInvokeActivity]):
+        data: Optional[Any] = ctx.activity.value.data
+        dialog_type = data.get("submissiondialogtype") if data else None
+
+        if dialog_type == "some_type":
+            await ctx.send(json.dumps(ctx.activity.value))
+
+        return TaskModuleResponse(task=TaskModuleMessageResponse(value="Received submit"))
    # highlight-success-end
    ```

  </TabItem>
  <TabItem value="v2" label="Teams SDK v2">
    ```python
    @app.on_dialog_open
    async def handle_dialog_open(ctx: ActivityContext[TaskFetchInvokeActivity]):
        data: Optional[Any] = ctx.activity.value.data
        dialog_type = data.get("opendialogtype") if data else None

        if dialog_type == "some_type":
             return InvokeResponse(
                body=TaskModuleResponse(
                    task=TaskModuleContinueResponse(
                        value=UrlTaskModuleTaskInfo(
                            title="Dialog title",
                            height="medium",
                            width="medium",
                            url= f"https://${os.getenv("YOUR_WEBSITE_DOMAIN")}/some-path",
                            fallback_url= f"https://${os.getenv("YOUR_WEBSITE_DOMAIN")}/fallback-path-for-web",
                            completion_bot_id= os.getenv("ENTRA_APP_CLIENT_ID"),
                        )
                    )
                )
            )

    @app.on_dialog_submit
    async def handle_dialog_submit(ctx: ActivityContext[TaskSubmitInvokeActivity]):
        data: Optional[Any] = ctx.activity.value.data
        dialog_type = data.get("submissiondialogtype") if data else None

        if dialog_type == "some_type":
            await ctx.send(json.dumps(ctx.activity.value))

        return TaskModuleResponse(task=TaskModuleMessageResponse(value="Received submit"))
    ```

  </TabItem>
  <TabItem value="v1" label="Teams SDK v1">
    ```python
    @app.task_module.fetch("connect-account")
    async def on_connect_account(context: TurnContext, _state: TurnState):
        return TaskModuleTaskInfo(
            title="Connect your Microsoft 365 account",
            height="medium",
            width="medium",
            url=f"https://{config.NEXT_PUBLIC_BOT_DOMAIN}/connections",
            fallbackUrl=f"https://{config.NEXT_PUBLIC_BOT_DOMAIN}/connections",
            completionBotId=config.NEXT_PUBLIC_BOT_ID,
        )

    @app.task_modules.submit("connect-account")
    async def on_submit_connect_account(context: TurnContext, _state: TurnState, data: Dict[str, Any]):
        print(json.dumps(data))
        await context.send_activity("You are all set! Now, how can I help you today?")
        return None
    ```

  </TabItem>
</Tabs>

<!-- adaptive-cards -->

<Tabs>
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-    @app.message("/card")
-    async def adaptive_card(context: TurnContext, _state: AppTurnState) -> bool:
-        attachment = CardFactory.adaptive_card(
-             {
-                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
-                "version": "1.6",
-                "type": "AdaptiveCard",
-                "body": [
-                    {
-                        "text": "Hello, world!",
-                        "wrap": True,
-                        "type": "TextBlock",
-                    },
-                ],
-                "msteams": {
-                    "width": "Full"
-                }
-            }
-        )
-        await context.send_activity(Activity(attachments=[attachment]))
-        return True
    # highlight-error-end
    # highlight-success-start
+    @app.on_message_pattern("/card")
+    async def handle_card_message(ctx: ActivityContext[MessageActivity]):
+        print(f"[CARD] Card requested by: {ctx.activity.from_}")
+        card = AdaptiveCard.model_validate(
+            {
+                "schema": "http://adaptivecards.io/schemas/adaptive-card.json",
+                "version": "1.6",
+                "type": "AdaptiveCard",
+                "body": [
+                    {
+                        "text": "Hello, world!",
+                        "wrap": True,
+                        "type": "TextBlock",
+                    },
+                ],
+                "msteams": {
+                    "width": "Full"
+                }
+            }
+        )
+        await ctx.send(card)
    # highlight-success-end
    ```

  </TabItem>
  <TabItem value="v2-option1" label="Teams SDK v2 (Option 1)">
    For existing cards like this, the simplest way to convert that to Teams SDK is this:

    ```python
    @app.on_message_pattern("/card")
    async def handle_card_message(ctx: ActivityContext[MessageActivity]):
        print(f"[CARD] Card requested by: {ctx.activity.from_}")
        card = AdaptiveCard.model_validate(
            {
                "schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.6",
                "type": "AdaptiveCard",
                "body": [
                    {
                        "text": "Hello, world!",
                        "wrap": True,
                        "type": "TextBlock",
                    },
                ],
                "msteams": {
                    "width": "Full"
                }
            }
        )
        await ctx.send(card)
    ```

  </TabItem>
  <TabItem value="v2-option2" label="Teams SDK v2 (Option 2)">
    For a more thorough port, you could also do the following:

    ```python
    @app.on_message_pattern("/card")
    async def handle_card_message(ctx: ActivityContext[MessageActivity]):
        card = AdaptiveCard(
            schema="http://adaptivecards.io/schemas/adaptive-card.json",
            body=[
                TextBlock(text="Hello, world", wrap=True, weight="Bolder"),
            ],
            ms_teams=TeamsCardProperties(width='full'),
        )
        await ctx.send(card)
    ```

  </TabItem>
  <TabItem value="v1" label="Teams SDK v1">
    ```python
    @app.message("/card")
    async def adaptive_card(context: TurnContext, _state: AppTurnState) -> bool:
        attachment = CardFactory.adaptive_card(
             {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.6",
                "type": "AdaptiveCard",
                "body": [
                    {
                        "text": "Hello, world!",
                        "wrap": True,
                        "type": "TextBlock",
                    },
                ],
                "msteams": {
                    "width": "Full"
                }
            }
        )
        await context.send_activity(Activity(attachments=[attachment]))
        return True
    ```
  </TabItem>
</Tabs>

<!-- authentication -->

<Tabs>
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-    app = Application[TurnState[ConversationState, UserState, TempState]](
-        ApplicationOptions(
-            bot_app_id=config.APP_ID,
-            storage=MemoryStorage(),
-            adapter=TeamsAdapter(config),
-            auth=AuthOptions(
-                default="graph",
-                auto=True,
-                settings={
-                    "graph": OAuthOptions(
-                        connection_name=config.OAUTH_CONNECTION_NAME,
-                        title="Sign In",
-                        text="please sign in",
-                        end_on_invalid_message=True,
-                        enable_sso=True,
-                    ),
-                },
-            ),
-        )
-    )
-
-    auth = app.auth.get("graph")
-
-    @app.message("/signout")
-    async def on_sign_out(
-        context: TurnContext, state: TurnState[ConversationState, UserState, TempState]
-    ):
-        await auth.sign_out(context, state)
-        await context.send_activity("you are now signed out...👋")
-        return False
-
-    @auth.on_sign_in_success
-    async def on_sign_in_success(
-        context: TurnContext, state: TurnState[ConversationState, UserState, TempState]
-    ):
-        await context.send_activity("successfully logged in!")
-        await context.send_activity(f"token: {state.temp.auth_tokens['graph']}")
-
-    @auth.on_sign_in_failure
-    async def on_sign_in_failure(
-        context: TurnContext,
-        _state: TurnState[ConversationState, UserState, TempState],
-        _res: SignInResponse,
-    ):
-        await context.send_activity("failed to login...")
    # highlight-error-end
    # highlight-success-start
+    app = App()
+
+    @app.on_message
+    async def handle_message(ctx: ActivityContext[MessageActivity]):
+        ctx.logger.info("User requested sign-in.")
+        if ctx.is_signed_in:
+            await ctx.send("You are already signed in.")
+        else:
+            await ctx.sign_in()
+
+    @app.on_message_pattern("/signout")
+    async def handle_sign_out(ctx: ActivityContext[MessageActivity]):
+        await ctx.sign_out()
+        await ctx.send("You have been signed out.")
+
+    @app.event("sign_in")
+    async def handle_sign_in(event: SignInEvent):
+        """Handle sign-in events."""
+        await event.activity_ctx.send("You are now signed in!")
+
+    @app.event("error")
+    async def handle_error(event: ErrorEvent):
+        """Handle error events."""
+        print(f"Error occurred: {event.error}")
+        if event.context:
+            print(f"Context: {event.context}")
    # highlight-success-end
    ```

  </TabItem>
  <TabItem value="v2" label="Teams SDK v2">
    ```python
    app = App()

    @app.on_message
    async def handle_message(ctx: ActivityContext[MessageActivity]):
        ctx.logger.info("User requested sign-in.")
        if ctx.is_signed_in:
            await ctx.send("You are already signed in.")
        else:
            await ctx.sign_in()

    @app.on_message_pattern("/signout")
    async def handle_sign_out(ctx: ActivityContext[MessageActivity]):
        await ctx.sign_out()
        await ctx.send("You have been signed out.")

    @app.event("sign_in")
    async def handle_sign_in(event: SignInEvent):
        """Handle sign-in events."""
        await event.activity_ctx.send("You are now signed in!")

    @app.event("error")
    async def handle_error(event: ErrorEvent):
        """Handle error events."""
        print(f"Error occurred: {event.error}")
        if event.context:
            print(f"Context: {event.context}")
    ```

  </TabItem>
  <TabItem value="v1" label="Teams SDK v1">
    ```python
    app = Application[TurnState[ConversationState, UserState, TempState]](
        ApplicationOptions(
            bot_app_id=config.APP_ID,
            storage=MemoryStorage(),
            adapter=TeamsAdapter(config),
            auth=AuthOptions(
                default="graph",
                auto=True,
                settings={
                    "graph": OAuthOptions(
                        connection_name=config.OAUTH_CONNECTION_NAME,
                        title="Sign In",
                        text="please sign in",
                        end_on_invalid_message=True,
                        enable_sso=True,
                    ),
                },
            ),
        )
    )

    auth = app.auth.get("graph")

    @app.message("/signout")
    async def on_sign_out(
        context: TurnContext, state: TurnState[ConversationState, UserState, TempState]
    ):
        await auth.sign_out(context, state)
        await context.send_activity("you are now signed out...👋")
        return False

    @auth.on_sign_in_success
    async def on_sign_in_success(
        context: TurnContext, state: TurnState[ConversationState, UserState, TempState]
    ):
        await context.send_activity("successfully logged in!")
        await context.send_activity(f"token: {state.temp.auth_tokens['graph']}")

    @auth.on_sign_in_failure
    async def on_sign_in_failure(
        context: TurnContext,
        _state: TurnState[ConversationState, UserState, TempState],
        _res: SignInResponse,
    ):
        await context.send_activity("failed to login...")
    ```

  </TabItem>
</Tabs>

<!-- ai-content -->

### Action planner

When we created Teams SDK, LLM's didn't natively support tool calling or orchestration. A lot has changed since then, which is why we decided to deprecate `ActionPlanner` from Teams SDK, and replace it with something a bit more lightweight. Notably, Teams SDK had two similar concepts: functions and actions. In Teams SDK, these are consolidated into functions.

<Tabs>
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-    # Create AI components
-    model = OpenAIModel(
-        OpenAIModelOptions(api_key=config.OPENAI_KEY, default_model="gpt-4o")
-    )
-
-    prompts = PromptManager(
-        PromptManagerOptions(prompts_folder=f"{os.path.dirname(__file__)}/prompts")
-    )
-
-    # Define a prompt function for getting the current status of the lights
-    @prompts.function("get_light_status")
-    async def on_get_light_status(context, state, functions, tokenizer, args):
-        return "on" if state.get("conversation.lightsOn") else "off"
-
-    planner = ActionPlanner(
-        ActionPlannerOptions(model=model, prompts=prompts, default_prompt="tools")
-    )
-
-    # Define storage and application
-    storage = MemoryStorage()
-    app = Application[AppTurnState](
-        ApplicationOptions(
-            bot_app_id=config.APP_ID,
-            storage=storage,
-            adapter=TeamsAdapter(config),
-            ai=AIOptions(planner=planner),
-        )
-    )
-
-    # Register action handlers
-    @app.ai.action("LightsOn")
-    async def on_lights_on(context: ActionTurnContext, state: AppTurnState):
-        state.conversation.lights_on = True
-        return "the lights are now on"
-
-    @app.ai.action("LightsOff")
-    async def on_lights_off(context: ActionTurnContext, state: AppTurnState):
-        state.conversation.lights_on = False
-        return "the lights are now off"
-
-    @app.ai.action("Pause")
-    async def on_pause(context: ActionTurnContext, state: AppTurnState):
-        time_ms = int(context.data["time"]) if context.data["time"] else 1000
-        time.sleep(time_ms / 1000)
-        return "done pausing"
    # highlight-error-end
    # highlight-success-start
+    import asyncio
+    from microsoft_teams.ai import ChatPrompt
+    from microsoft_teams.api import MessageActivity
+    from microsoft_teams.apps import ActivityContext, App
+    from microsoft_teams.common import LocalStorage
+    from microsoft_teams.openai import OpenAICompletionsAIModel
+
+    storage = LocalStorage()
+    app = App()
+
+    @app.on_message
+    async def handle_message(ctx: ActivityContext[MessageActivity]):
+        state = storage.get(ctx.activity.from_.id) or {"lights_on": False}
+
+        prompt = ChatPrompt(
+            instructions="You are a helpful assistant that can control lights.",
+            model=OpenAICompletionsAIModel(model="gpt-4o"),
+        )
+
+        # Define functions inline
+        prompt.function(
+            "get_light_status",
+            "Gets the current status of the lights",
+            lambda: "on" if state["lights_on"] else "off"
+        )
+
+        prompt.function(
+            "lights_on",
+            "Turns the lights on",
+            lambda: (state.update({"lights_on": True}), "the lights are now on")[1]
+        )
+
+        prompt.function(
+            "lights_off",
+            "Turns the lights off",
+            lambda: (state.update({"lights_on": False}), "the lights are now off")[1]
+        )
+
+        async def pause(time: int):
+            await asyncio.sleep(time / 1000)
+            return "done pausing"
+
+        prompt.function(
+            "pause",
+            "Delays for a period of time",
+            {
+                "type": "object",
+                "properties": {
+                    "time": {
+                        "type": "number",
+                        "description": "The amount of time to delay in milliseconds"
+                    }
+                },
+                "required": ["time"]
+            },
+            pause
+        )
+
+        result = await prompt.send(ctx.activity.text)
+        storage.set(ctx.activity.from_.id, state)
+
+        if result.response.content:
+            await ctx.send(result.response.content)
    # highlight-success-end
    ```

  </TabItem>
  <TabItem value="v2" label="Teams SDK v2">
    In Teams SDK, there is no `actions.json` file. Instead, function prompts, parameters, etc. are declared in your code.

    ```python
    import asyncio
    from microsoft_teams.ai import ChatPrompt
    from microsoft_teams.api import MessageActivity
    from microsoft_teams.apps import ActivityContext, App
    from microsoft_teams.common import LocalStorage
    from microsoft_teams.openai import OpenAICompletionsAIModel

    storage = LocalStorage()
    app = App()

    @app.on_message
    async def handle_message(ctx: ActivityContext[MessageActivity]):
        state = storage.get(ctx.activity.from_.id) or {"lights_on": False}

        prompt = ChatPrompt(
            instructions="You are a helpful assistant that can control lights.",
            model=OpenAICompletionsAIModel(model="gpt-4o"),
        )

        # Define functions inline - no separate actions.json needed
        prompt.function(
            "get_light_status",
            "Gets the current status of the lights",
            lambda: "on" if state["lights_on"] else "off"
        )

        prompt.function(
            "lights_on",
            "Turns the lights on",
            lambda: (state.update({"lights_on": True}), "the lights are now on")[1]
        )

        prompt.function(
            "lights_off",
            "Turns the lights off",
            lambda: (state.update({"lights_on": False}), "the lights are now off")[1]
        )

        async def pause(time: int):
            await asyncio.sleep(time / 1000)
            return "done pausing"

        prompt.function(
            "pause",
            "Delays for a period of time",
            {
                "type": "object",
                "properties": {
                    "time": {
                        "type": "number",
                        "description": "The amount of time to delay in milliseconds"
                    }
                },
                "required": ["time"]
            },
            pause
        )

        result = await prompt.send(ctx.activity.text)
        storage.set(ctx.activity.from_.id, state)

        if result.response.content:
            await ctx.send(result.response.content)
    ```

  </TabItem>
  <TabItem value="v1" label="Teams SDK v1">
    ```python
    # Create AI components
    model = OpenAIModel(
        OpenAIModelOptions(api_key=config.OPENAI_KEY, default_model="gpt-4o")
    )

    prompts = PromptManager(
        PromptManagerOptions(prompts_folder=f"{os.path.dirname(__file__)}/prompts")
    )

    # Define a prompt function for getting the current status of the lights
    @prompts.function("get_light_status")
    async def on_get_light_status(context, state, functions, tokenizer, args):
        return "on" if state.get("conversation.lightsOn") else "off"

    planner = ActionPlanner(
        ActionPlannerOptions(model=model, prompts=prompts, default_prompt="tools")
    )

    # Define storage and application
    storage = MemoryStorage()
    app = Application[AppTurnState](
        ApplicationOptions(
            bot_app_id=config.APP_ID,
            storage=storage,
            adapter=TeamsAdapter(config),
            ai=AIOptions(planner=planner),
        )
    )

    # Register action handlers
    @app.ai.action("LightsOn")
    async def on_lights_on(context: ActionTurnContext, state: AppTurnState):
        state.conversation.lights_on = True
        return "the lights are now on"

    @app.ai.action("LightsOff")
    async def on_lights_off(context: ActionTurnContext, state: AppTurnState):
        state.conversation.lights_on = False
        return "the lights are now off"

    @app.ai.action("Pause")
    async def on_pause(context: ActionTurnContext, state: AppTurnState):
        time_ms = int(context.data["time"]) if context.data["time"] else 1000
        time.sleep(time_ms / 1000)
        return "done pausing"

    @app.ai.action("LightStatus")
    async def on_lights_status(context: ActionTurnContext, state: AppTurnState):
        return "the lights are on" if state.conversation.lights_on else "the lights are off"
    ```

    And the corresponding `actions.json` file:

    ```json
    [
        {
            "name": "LightsOn",
            "description": "Turns on the lights"
        },
        {
            "name": "LightsOff",
            "description": "Turns off the lights"
        },
        {
            "name": "Pause",
            "description": "Delays for a period of time",
            "parameters": {
                "type": "object",
                "properties": {
                    "time": {
                        "type": "number",
                        "description": "The amount of time to delay in milliseconds"
                    }
                },
                "required": ["time"]
            }
        },
        {
            "name": "LightStatus",
            "description": "Gets the lights status"
        }
    ]
    ```

  </TabItem>
</Tabs>

<!-- feedback -->

<Tabs>
  <TabItem value="Diff" default>
    ```python
    # highlight-error-start
-    app = Application[AppTurnState](
-        ApplicationOptions(
-            # ... other options
-            ai=AIOptions(
-                enable_feedback_loop=enableFeedbackLoop
-            ),
-        )
-    )
-
-    @app.message()
-    async def on_message(context: TurnContext, state: AppTurnState):
-        await context.send_activity(Activity(text="Hey, give me feedback!", channel_data={"feedbackLoop": { "type": "custom"}}))
-
-    @app.feedback_loop()
-    async def feedback_loop(context: TurnContext, state: AppTurnState, feedback_data: FeedbackLoopData):
-        print("Feedback loop triggered")
    # highlight-error-end
    # highlight-success-start
+    # Reply with message including feedback buttons
+    @app.on_message
+    async def handle_feedback(ctx: ActivityContext[MessageActivity]):
+        await ctx.send(MessageActivityInput(text="Hey, give me feedback!").add_ai_generated().add_feedback())
+
+    @app.on_message_submit_feedback
+    async def handle_message_feedback(ctx: ActivityContext[MessageSubmitActionInvokeActivity]):
+        # Custom logic here..
    # highlight-success-end
    ```

  </TabItem>
  <TabItem value="v2" label="Teams SDK v2">
    ```python
    # Reply with message including feedback buttons
    @app.on_message
    async def handle_feedback(ctx: ActivityContext[MessageActivity]):
        await ctx.send(MessageActivityInput(text="Hey, give me feedback!").add_ai_generated().add_feedback())

    @app.on_message_submit_feedback
    async def handle_message_feedback(ctx: ActivityContext[MessageSubmitActionInvokeActivity]):
        # Custom logic here..
    ```

    _Note:_ In Teams SDK, you do not need to opt into feedback at the `App` level.

  </TabItem>
  <TabItem value="v1" label="Teams SDK v1">
    ```python
    app = Application[AppTurnState](
        ApplicationOptions(
            # ... other options
            ai=AIOptions(
                enable_feedback_loop=enableFeedbackLoop
            ),
        )
    )

    @app.message()
    async def on_message(context: TurnContext, state: AppTurnState):
        await context.send_activity(Activity(text="Hey, give me feedback!", channel_data={"feedbackLoop": { "type": "custom"}}))

    @app.feedback_loop()
    async def feedback_loop(context: TurnContext, state: AppTurnState, feedback_data: FeedbackLoopData):
        print("Feedback loop triggered")
    ```

  </TabItem>
</Tabs>

<!-- botbuilder-plugin -->

## Incrementally migrating code via botbuilder plugin

:::info
Comparison code coming soon!
:::

If you aren't ready to migrate all of your code, you can run your existing Teams SDK code in parallel with Teams SDK. Learn more [here](./botbuilder/integration).
