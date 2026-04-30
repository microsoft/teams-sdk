<!-- single-action-example -->

```python
from microsoft_teams.cards.core import ExecuteAction
# ...

action = ExecuteAction(title="Submit Feedback")
                    .with_data({"action": "submit_feedback"})
                    .with_associated_inputs("auto")
```

<!-- action-set-example -->

```python
from microsoft_teams.cards.core import ActionSet, ExecuteAction, OpenUrlAction
# ...

action_set = ActionSet(
                actions=[
                    ExecuteAction(title="Submit Feedback")
                    .with_data({"action": "submit_feedback"}),
                    OpenUrlAction(url="https://adaptivecards.microsoft.com").with_title("Learn More")
                ]
            ),
```

<!-- json-safety-note -->

You get type safety for free in Python.

<!-- raw-json-example -->

```python
json = {
  "type": "Action.OpenUrl",
  "url": "https://adaptivecards.microsoft.com",
  "title": "Learn More",
}
```

<!-- input-association-example -->

```python
from microsoft_teams.cards import AdaptiveCard, ActionSet, ExecuteAction, OpenUrlAction
from microsoft_teams.cards.core import TextInput, ToggleInput
# ...

profile_card = AdaptiveCard(
        schema="http://adaptivecards.io/schemas/adaptive-card.json",
        body=[
            TextInput(id="name").with_label("Name").with_value("John Doe"),
            TextInput(id="email", label="Email", value="john@contoso.com"),
            ToggleInput(title="Subscribe to newsletter").with_id("subscribe").with_value("false"),
            ActionSet(
                actions=[
                    ExecuteAction(title="Save")
                    # entity_id will come back after the user submits
                    .with_data({"action": "save_profile", "entity_id": "12345"}),
                ]
            ),
        ],
    )

# Data received in handler:
"""
{
  "action": "save_profile",
  "entity_id": "12345",     # From action data
  "name": "John Doe",       # From name input
  "email": "john@doe.com",  # From email input
  "subscribe": "true"       # From toggle input (as string)
}
"""
```

<!-- input-validation-example -->

```python
from microsoft_teams.cards import AdaptiveCard, ActionSet, ExecuteAction, NumberInput, TextInput
# ...

def create_profile_card_input_validation():
    age_input = NumberInput(id="age").with_label("age").with_is_required(True).with_min(0).with_max(120)
    # Can configure custom error messages
    name_input = TextInput(id="name").with_label("Name").with_is_required(True).with_error_message("Name is required")

    card = AdaptiveCard(
        schema="http://adaptivecards.io/schemas/adaptive-card.json",
        body=[
            age_input,
            name_input,
            TextInput(id="location").with_label("Location"),
            ActionSet(
                actions=[
                    ExecuteAction(title="Save")
                    # All inputs should be validated
                    .with_data({"action": "save_profile"})
                    .with_associated_inputs("auto")
                ]
            ),
        ],
    )
    return card
```

<!-- handlers-section -->

## Routing & Handlers

### Using SubmitData

The SDK provides a `SubmitData` helper that sets the routing key for your action. This is the recommended way to wire up actions to specific handlers:

```python
from microsoft_teams.cards import ExecuteAction, SubmitData
# ...

ExecuteAction(title="Submit Feedback") \
    .with_data(SubmitData("submit_feedback")) \
    .with_associated_inputs("auto")

# You can also pass extra static data alongside the action name
ExecuteAction(title="Save") \
    .with_data(SubmitData("save_profile", {"entity_id": "12345"})) \
    .with_associated_inputs("auto")
```

`SubmitData` sets a reserved `action` key in the card's data payload. When the user clicks the button, the SDK router reads this key to dispatch to the matching handler.

### Action-Specific Handlers

Register handlers for specific actions. When you use `SubmitData` to set the action name on the card, the SDK routes directly to the matching handler:

```python
from microsoft_teams.apps import App, ActivityContext
from microsoft_teams.api import AdaptiveCardInvokeActivity, AdaptiveCardActionMessageResponse, AdaptiveCardInvokeResponse
# ...

# 'submit_feedback' matches the identifier passed to SubmitData('submit_feedback')
@app.on_card_action_execute("submit_feedback")
async def handle_submit_feedback(ctx: ActivityContext[AdaptiveCardInvokeActivity]) -> AdaptiveCardInvokeResponse:
    data = ctx.activity.value.action.data
    await ctx.send(f"Feedback received: {data.get('feedback')}")
    return AdaptiveCardActionMessageResponse(
        status_code=200,
        type="application/vnd.microsoft.activity.message",
        value="Action processed successfully",
    )

@app.on_card_action_execute("save_profile")
async def handle_save_profile(ctx: ActivityContext[AdaptiveCardInvokeActivity]) -> AdaptiveCardInvokeResponse:
    data = ctx.activity.value.action.data
    await ctx.send(f"Profile saved!\nName: {data.get('name')}\nEmail: {data.get('email')}")
    return AdaptiveCardActionMessageResponse(
        status_code=200,
        type="application/vnd.microsoft.activity.message",
        value="Action processed successfully",
    )
```

The decorator argument matches the value passed to `SubmitData`. Both the catch-all `@app.on_card_action` handler and the specific `@app.on_card_action_execute` handler will fire when a match is found.

This is cleaner than a catch-all with a switch statement, and scales better as you add more actions.

### Catch-All Handler

If you need to handle all card actions in one place, you can use the catch-all handler:

```python
from microsoft_teams.api import AdaptiveCardInvokeActivity, AdaptiveCardActionErrorResponse, AdaptiveCardActionMessageResponse, HttpError, InnerHttpError, AdaptiveCardInvokeResponse
from microsoft_teams.apps import ActivityContext
# ...

@app.on_card_action
async def handle_card_action(ctx: ActivityContext[AdaptiveCardInvokeActivity]) -> AdaptiveCardInvokeResponse:
    data = ctx.activity.value.action.data
    if not data.get("action"):
        return AdaptiveCardActionErrorResponse(
            status_code=400,
            type="application/vnd.microsoft.error",
            value=HttpError(
                code="BadRequest",
                message="No action specified",
                inner_http_error=InnerHttpError(
                    status_code=400,
                    body={"error": "No action specified"},
                ),
            ),
        )

    print("Received action data:", data)

    if data["action"] == "submit_feedback":
        await ctx.send(f"Feedback received: {data.get('feedback')}")
    elif data["action"] == "purchase_item":
        await ctx.send(f"Purchase request received for game: {data.get('choiceGameSingle')}")
    elif data["action"] == "save_profile":
        await ctx.send(
            f"Profile saved!\nName: {data.get('name')}\nEmail: {data.get('email')}\nSubscribed: {data.get('subscribe')}"
        )
    else:
        return AdaptiveCardActionErrorResponse(
            status_code=400,
            type="application/vnd.microsoft.error",
            value=HttpError(
                code="BadRequest",
                message="Unknown action",
                inner_http_error=InnerHttpError(
                    status_code=400,
                    body={"error": "Unknown action"},
                ),
            ),
        )

    return AdaptiveCardActionMessageResponse(
        status_code=200,
        type="application/vnd.microsoft.activity.message",
        value="Action processed successfully",
    )
```

:::note
The `data` values are accessible as a dictionary and can be accessed using `.get()` method for safe access.
:::