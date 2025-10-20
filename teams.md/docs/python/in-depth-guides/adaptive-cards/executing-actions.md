---
sidebar_position: 2
summary: Guide to implementing interactive elements in Adaptive Cards using Python, covering action types (Execute, Submit, OpenUrl), input validation, data association, and server-side handling of card actions.
---

# Executing Actions

Adaptive Cards support interactive elements through **actions**—buttons, links, and input submission triggers that respond to user interaction.  
You can use these to collect form input, trigger workflows, show task modules, open URLs, and more.

---

## Action Types

The Teams AI Library supports several action types for different interaction patterns:

| Action Type               | Purpose                | Description                                                                  |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `Action.Execute`          | Server‑side processing | Send data to your bot for processing. Best for forms & multi‑step workflows. |
| `Action.Submit`           | Simple data submission | Legacy action type. Prefer `Execute` for new projects.                       |
| `Action.OpenUrl`          | External navigation    | Open a URL in the user's browser.                                            |
| `Action.ShowCard`         | Progressive disclosure | Display a nested card when clicked.                                          |
| `Action.ToggleVisibility` | UI state management    | Show/hide card elements dynamically.                                         |

> For complete reference, see the [official documentation](https://adaptivecards.microsoft.com/?topic=Action.Execute).

---

## Creating Actions with the SDK

### Single Actions

The SDK provides builder helpers that abstract the underlying JSON. For example:

```python
from microsoft.teams.cards.core import ExecuteAction
# ...

action = ExecuteAction(title="Submit Feedback")
                    .with_data({"action": "submit_feedback"})
                    .with_associated_inputs("auto")
```
### Action Sets

Group actions together using `ActionSet`:

```python
from microsoft.teams.cards.core import ActionSet, ExecuteAction, OpenUrlAction
# ...

action_set = ActionSet(
                actions=[
                    ExecuteAction(title="Submit Feedback")
                    .with_data({"action": "submit_feedback"}),
                    OpenUrlAction(url="https://adaptivecards.microsoft.com").with_title("Learn More")
                ]
            ),
```

### Raw JSON Alternative

Just like when building cards, if you prefer to work with raw JSON, you can do just that. You get type safety for free in Python.

```python
json = {
  "type": "Action.OpenUrl",
  "url": "https://adaptivecards.microsoft.com",
  "title": "Learn More",
}
```

---

## Working with Input Values

### Associating data with the cards

Sometimes you want to send a card and have it be associated with some data. Set the `data` value to be sent back to the client so you can associate it with a particular entity.

```python
from microsoft.teams.cards import AdaptiveCard, ActionSet, ExecuteAction, OpenUrlAction
from microsoft.teams.cards.core import TextInput, ToggleInput
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
                    OpenUrlAction(url="https://adaptivecards.microsoft.com").with_title("Learn More")
                ]
            ),
        ],
    )

```

### Input Validation

Input Controls provide ways for you to validate. More details can be found on the Adaptive Cards [documentation](https://adaptivecards.microsoft.com/?topic=input-validation).

```python
from microsoft.teams.cards import AdaptiveCard, ActionSet, ExecuteAction, NumberInput, TextInput
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

## Server Handlers

### Basic Structure

Card actions arrive as `card_action` activities in your app. These give you access to the validated input values plus any `data` values you had configured to be sent back to you.

```python
from microsoft.teams.api import AdaptiveCardInvokeActivity, AdaptiveCardActionErrorResponse, AdaptiveCardActionMessageResponse, HttpError, InnerHttpError, AdaptiveCardInvokeResponse
from microsoft.teams.apps import ActivityContext
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
