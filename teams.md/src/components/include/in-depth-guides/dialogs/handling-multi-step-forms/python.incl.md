<!-- initial-setup -->

Start by returning the first step's card from the `dialog_open` handler.

<!-- initial-card -->

```python
from microsoft_teams.api import (
    TaskFetchInvokeActivity, TaskModuleResponse,
    TaskModuleContinueResponse, CardTaskModuleTaskInfo,
    AdaptiveCardAttachment, card_attachment,
)
from microsoft_teams.apps import ActivityContext
from microsoft_teams.cards import AdaptiveCard, TextBlock, TextInput, SubmitAction, SubmitData
# ...

@app.on_dialog_open("multi_step_form")
async def handle_multi_step_open(ctx: ActivityContext[TaskFetchInvokeActivity]):
    dialog_card = AdaptiveCard(
        schema="http://adaptivecards.io/schemas/adaptive-card.json",
        body=[
            TextBlock(text="This is a multi-step form", size="Large", weight="Bolder"),
            TextInput().with_label("Name").with_is_required(True).with_id("name").with_placeholder("Enter your name"),
        ],
        # Route to a step-specific submit handler
        actions=[
            SubmitAction().with_title("Submit").with_data(SubmitData("multi_step_1"))
        ]
    )

    return TaskModuleResponse(
        task=TaskModuleContinueResponse(
            value=CardTaskModuleTaskInfo(
                title="Multi-step Form Dialog",
                card=card_attachment(AdaptiveCardAttachment(content=dialog_card)),
            )
        )
    )
```

<!-- submission-handler -->

Then in the submission handler, return `type: "continue"` with the next card to keep the dialog open. Pass state forward using `SubmitData`'s extra data parameter.

```python
from microsoft_teams.api import (
    TaskSubmitInvokeActivity, TaskModuleResponse, TaskModuleMessageResponse,
    TaskModuleContinueResponse, CardTaskModuleTaskInfo,
    AdaptiveCardAttachment, card_attachment,
)
from microsoft_teams.apps import ActivityContext
from microsoft_teams.cards import AdaptiveCard, TextBlock, TextInput, SubmitAction, SubmitData
# ...

# Step 1 submit — show step 2
@app.on_dialog_submit("multi_step_1")
async def handle_multi_step_1_submit(ctx: ActivityContext[TaskSubmitInvokeActivity]):
    data = ctx.activity.value.data
    name = data.get("name")

    next_step_card = AdaptiveCard(
        schema="http://adaptivecards.io/schemas/adaptive-card.json",
        body=[
            TextBlock(text="Email", size="Large", weight="Bolder"),
            TextInput().with_label("Email").with_is_required(True).with_id("email").with_placeholder("Enter your email"),
        ],
        actions=[
            # Carry forward data from step 1 via extra data
            SubmitAction().with_title("Submit").with_data(
                SubmitData("multi_step_2", {"name": name})
            )
        ]
    )

    return TaskModuleResponse(
        task=TaskModuleContinueResponse(
            value=CardTaskModuleTaskInfo(
                title=f"Thanks {name} - Get Email",
                card=card_attachment(AdaptiveCardAttachment(content=next_step_card)),
            )
        )
    )

# Step 2 submit — final step, close the dialog
@app.on_dialog_submit("multi_step_2")
async def handle_multi_step_2_submit(ctx: ActivityContext[TaskSubmitInvokeActivity]):
    data = ctx.activity.value.data
    name = data.get("name")
    email = data.get("email")
    await ctx.send(f"Hi {name}, thanks for submitting the form! We got that your email is {email}")
    return TaskModuleResponse(task=TaskModuleMessageResponse(value="Multi-step form completed successfully"))
```

<!-- complete-example -->

N/A
