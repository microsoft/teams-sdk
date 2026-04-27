<!-- entry-point-intro -->

To open a dialog, add a button to your Adaptive Card using `OpenDialogData`. This sets up the `task/fetch` protocol and includes a `dialog_id` that the SDK uses to route to the correct handler.

<!-- entry-point-code -->

```python
from microsoft_teams.api import MessageActivity, MessageActivityInput, TypingActivityInput
from microsoft_teams.apps import ActivityContext
from microsoft_teams.cards import AdaptiveCard, TextBlock, SubmitAction, OpenDialogData
# ...

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    await ctx.reply(TypingActivityInput())

    card = AdaptiveCard(
        schema="http://adaptivecards.io/schemas/adaptive-card.json",
        body=[
            TextBlock(
                text="Select the examples you want to see!",
                size="Large",
                weight="Bolder",
            )
        ]
    ).with_actions([
        # OpenDialogData sets msteams.type = "task/fetch" and adds dialog_id for routing
        SubmitAction(title="Simple form test").with_data(OpenDialogData("simple_form")),
        SubmitAction(title="Webpage Dialog").with_data(OpenDialogData("webpage_dialog")),
        SubmitAction(title="Multi-step Form").with_data(OpenDialogData("multi_step_form")),
    ])

    message = MessageActivityInput(text="Enter this form").add_card(card)
    await ctx.send(message)
```

<!-- dialog-open-intro -->

When a user clicks the button, Teams sends a `task/fetch` invoke to your app. Register a handler with `@app.on_dialog_open("dialog_id")` to handle a specific dialog, or `@app.on_dialog_open()` for a catch-all.

:::tip
Use `@app.on_dialog_open("simple_form")` to handle specific dialogs directly, instead of a single catch-all handler with if-else logic. This keeps each handler focused and avoids routing boilerplate.
:::

<!-- dialog-open-code -->

```python
from microsoft_teams.api import (
    TaskFetchInvokeActivity, TaskModuleResponse,
    TaskModuleContinueResponse, CardTaskModuleTaskInfo,
    AdaptiveCardAttachment, card_attachment,
)
from microsoft_teams.apps import ActivityContext
from microsoft_teams.cards import AdaptiveCard
# ...

# Handle a specific dialog by ID — no if-else needed
@app.on_dialog_open("simple_form")
async def handle_simple_form_open(ctx: ActivityContext[TaskFetchInvokeActivity]):
    card = AdaptiveCard(...)

    return TaskModuleResponse(
        task=TaskModuleContinueResponse(
            value=CardTaskModuleTaskInfo(
                title="Title of Dialog",
                card=card_attachment(AdaptiveCardAttachment(content=card)),
            )
        )
    )
```

<!-- rendering-card-code -->

```python
from microsoft_teams.api import (
    TaskFetchInvokeActivity, TaskModuleResponse,
    TaskModuleContinueResponse, CardTaskModuleTaskInfo,
    AdaptiveCardAttachment, card_attachment,
)
from microsoft_teams.apps import ActivityContext
from microsoft_teams.cards import AdaptiveCard, TextBlock, TextInput, SubmitAction, SubmitData
# ...

@app.on_dialog_open("simple_form")
async def handle_simple_form_open(ctx: ActivityContext[TaskFetchInvokeActivity]):
    dialog_card = AdaptiveCard(
        schema="http://adaptivecards.io/schemas/adaptive-card.json",
        body=[
            TextBlock(text="This is a simple form", size="Large", weight="Bolder"),
            TextInput().with_label("Name").with_is_required(True).with_id("name").with_placeholder("Enter your name"),
        ],
        # Use SubmitData to set the "action" field, which routes to @app.on_dialog_submit("action")
        actions=[
            SubmitAction().with_title("Submit").with_data(SubmitData("simple_form"))
        ]
    )

    return TaskModuleResponse(
        task=TaskModuleContinueResponse(
            value=CardTaskModuleTaskInfo(
                title="Simple Form Dialog",
                card=card_attachment(AdaptiveCardAttachment(content=dialog_card)),
            )
        )
    )
```

<!-- rendering-webpage-code -->

```python
import os
from microsoft_teams.api import TaskModuleContinueResponse, TaskModuleResponse, UrlTaskModuleTaskInfo
# ...

@app.on_dialog_open("webpage_dialog")
async def handle_webpage_dialog_open(ctx):
    return TaskModuleResponse(
        task=TaskModuleContinueResponse(
            value=UrlTaskModuleTaskInfo(
                title="Webpage Dialog",
                # The webpage must be publicly accessible, use the teams-js client library,
                # and be registered in validDomains in the manifest.
                url=f"{os.getenv('BOT_ENDPOINT')}/tabs/dialog-form",
                width=1000,
                height=800,
            )
        )
    )
```

<!-- embedded-web-content -->

### Setting up Embedded Web Content

To serve web content for dialogs, you can use the `page` method to host static webpages:

```python
import os

# In your app setup (e.g., main.py)
# Hosts a static webpage at /tabs/dialog-form
app.page("customform", os.path.join(os.path.dirname(__file__), "views", "customform"), "/tabs/dialog-form")
```
