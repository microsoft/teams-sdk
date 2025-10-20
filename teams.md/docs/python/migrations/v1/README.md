---
sidebar_position: 2
summary: Migration guide from Teams AI v1 to v2 highlighting the key changes and upgrade steps for Python.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migrating from Teams AI v1

Welcome, fellow agent developer! You've made it through a full major release of Teams AI, and now you want to take the plunge into v2. In this guide, we'll walk you through everything you need to know, from migrating core features like message handlers and auth, to optional AI features.

## Installing Teams AI v2

First, let's install Teams AI v2 into your project. Notably, this won't replace any existing installation of Teams AI v1. When you've completed your migration, you can safely remove the `teams-ai` dependency from your `pyproject.toml` file.

```sh
uv add microsoft-teams-apps
```

## Migrate Application class

First, migrate your `Application` class from v1 to the new `App` class.

<Tabs>
  <TabItem value="v2" label="Teams AI v2">
    ```python
    # in main.py
    import asyncio
    import logging

    from microsoft.teams.api import MessageActivity
    from microsoft.teams.apps import ActivityContext, App, ErrorEvent
    from microsoft.teams.common import LocalStorage

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
  <TabItem value="v1" label="Teams AI v1">
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

## Migrate activity handlers

Both Teams AI v1 and v2 are built atop incoming `Activity` requests, which trigger handlers in your code when specific type of activities are received. The syntax for how you register different types of `Activity` handlers differs slightly between the v1 and v2 versions of our SDK.

### Message handlers

<Tabs>
<TabItem value="v2" label="Teams AI v2">
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
  <TabItem value="v1" label="Teams AI v1">
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

### Task modules

Note that on Microsoft Teams, task modules have been renamed to dialogs.

<Tabs>
  <TabItem value="v2" label="Teams AI v2">
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
  <TabItem value="v1" label="Teams AI v1">
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

Learn more [here](../../in-depth-guides/dialogs/README.md).

## Adaptive cards

In Teams AI v2, cards have much more rich type validation than existed in v1. However, assuming your cards were valid, it should be easy to migrate to v2.

<Tabs>
  <TabItem value="v2-option1" label="Teams AI v2 (Option 1)">
    For existing cards like this, the simplest way to convert that to Teams AI v2 is this:

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
  <TabItem value="v2-option2" label="Teams AI v2 (Option 2)">
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
  <TabItem value="v1" label="Teams AI v1">
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

Learn more [here](../../in-depth-guides/adaptive-cards/README.md).

## Authentication

Most agents feature authentication for user identification, interacting with APIs, etc. Whether your Teams AI v1 app used Entra SSO or custom OAuth, porting to v2 should be simple.

<Tabs>
  <TabItem value="v2" label="Teams AI v2">
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
  <TabItem value="v1" label="Teams AI v1">
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

## AI

### Feedback

If you supported feedback for AI generated messages, migrating is simple.

<Tabs>
  <TabItem value="v2" label="Teams AI v2">
    ```python
    # Reply with message including feedback buttons
    @app.on_message
    async def handle_feedback(ctx: ActivityContext[MessageActivity]):
        await ctx.send(MessageActivityInput(text="Hey, give me feedback!").add_ai_generated().add_feedback())

    @app.on_message_submit_feedback
    async def handle_message_feedback(ctx: ActivityContext[MessageSubmitActionInvokeActivity]):
        # Custom logic here..
    ```

    _Note:_ In Teams AI v2, you do not need to opt into feedback at the `App` level.

  </TabItem>
  <TabItem value="v1" label="Teams AI v1">
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

You can learn more about feedback in Teams AI v2 [here](../../in-depth-guides/feedback.md).
