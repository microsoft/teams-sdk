<!-- entry-point-intro -->

To open a dialog, you need to supply a special type of action as to the Adaptive Card. Once this button is clicked, the dialog will open and ask the application what to show.

<!-- entry-point-code -->

```python
from microsoft_teams.api import MessageActivity, MessageActivityInput, TypingActivityInput
from microsoft_teams.apps import ActivityContext
from microsoft_teams.cards import AdaptiveCard, TextBlock, TaskFetchAction
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
        # Special type of action to open a dialog
        TaskFetchAction(value={"OpenDialogType": "webpage_dialog"}).with_title("Webpage Dialog"),
        # This data will be passed back in an event, so we can handle what to show in the dialog
        TaskFetchAction(value={"OpenDialogType": "multi_step_form"}).with_title("Multi-step Form"),
        TaskFetchAction(value={"OpenDialogType": "mixed_example"}).with_title("Mixed Example")
    ])
    # Send the card as an attachment
    message = MessageActivityInput(text="Enter this form").add_card(card)
    await ctx.send(message)
```

<!-- dialog-open-intro -->

Once an action is executed to open a dialog, the Teams client will send an event to the agent to request what the content of the dialog should be. Here is how to handle this event:

<!-- dialog-open-code -->

```python
@app.on_dialog_open
async def handle_dialog_open(ctx: ActivityContext[TaskFetchInvokeActivity]):
    """Handle dialog open events for all dialog types."""
    card = AdaptiveCard(...)

    # Return an object with the task value that renders a card
    return InvokeResponse(
                body=TaskModuleResponse(
                    task=TaskModuleContinueResponse(
                        value=CardTaskModuleTaskInfo(
                            title="Title of Dialog",
                            card=card_attachment(AdaptiveCardAttachment(content=card)),
                        )
                    )
                )
            )
```

<!-- rendering-card-code -->

```python
from microsoft_teams.api import AdaptiveCardAttachment, TaskFetchInvokeActivity, InvokeResponse, card_attachment
from microsoft_teams.api import CardTaskModuleTaskInfo, TaskModuleContinueResponse, TaskModuleResponse
from microsoft_teams.apps import ActivityContext
from microsoft_teams.cards import AdaptiveCard, TextBlock, TextInput, SubmitAction, SubmitActionData
# ...

@app.on_dialog_open
async def handle_dialog_open(ctx: ActivityContext[TaskFetchInvokeActivity]):
    """Handle dialog open events for all dialog types."""
    # Return an object with the task value that renders a card
    dialog_card = AdaptiveCard(
        schema="http://adaptivecards.io/schemas/adaptive-card.json",
        body=[
            TextBlock(text="This is a simple form", size="Large", weight="Bolder"),
            TextInput().with_label("Name").with_is_required(True).with_id("name").with_placeholder("Enter your name"),
        ],
        actions=[
            SubmitAction().with_title("Submit").with_data(SubmitActionData(ms_teams={"SubmissionDialogType": "simple_form"}))
        ]
    )


    # Return an object with the task value that renders a card
    return InvokeResponse(
                body=TaskModuleResponse(
                    task=TaskModuleContinueResponse(
                        value=CardTaskModuleTaskInfo(
                            title="Simple Form Dialog",
                            card=card_attachment(AdaptiveCardAttachment(content=dialog_card)),
                        )
                    )
                )
            )
```

<!-- rendering-webpage-code -->

```python
import os
from microsoft_teams.api import InvokeResponse, TaskModuleContinueResponse, TaskModuleResponse, UrlTaskModuleTaskInfo
# ...

return InvokeResponse(
                body=TaskModuleResponse(
                    task=TaskModuleContinueResponse(
                        value=UrlTaskModuleTaskInfo(
                            title="Webpage Dialog",
                            # Here we are using a webpage that is hosted in the same
                            # server as the agent. This server needs to be publicly accessible,
                            # needs to set up teams.js client library (https://www.npmjs.com/package/@microsoft/teams-js)
                            # and needs to be registered in the manifest.
                            url=f"{os.getenv('BOT_ENDPOINT')}/tabs/dialog-webpage",
                            width=1000,
                            height=800,
                        )
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
