<!-- ai-generated-method -->

This can be done by calling the `.add_ai_generated()` method on outgoing messages.

<!-- ai-generated-code -->

```python
message = MessageActivityInput(text="Hello!").add_ai_generated()
```

<!-- citations-method -->

This is easy to do by using the `add_citation` method on the message.

<!-- citations-code -->

```python
from microsoft_teams.api import MessageActivityInput
from microsoft_teams.api.models.entity import CitationAppearance

message = MessageActivityInput(text=result.content).add_ai_generated()

for i, doc in enumerate(cited_docs):
    position = i + 1
    message.text += f"[{position}]"
    message.add_citation(
        position,
        CitationAppearance(name=doc.title, abstract=doc.content),
    )
```

<!-- suggested-actions-method -->

You can do that by using the `with_suggested_actions` method on the message.

<!-- suggested-actions-code -->

```python
from microsoft_teams.api import MessageActivityInput
from microsoft_teams.api.models.card.card_action import CardAction
from microsoft_teams.api.models.card.card_action_type import CardActionType
from microsoft_teams.api.models.suggested_actions import SuggestedActions

message = MessageActivityInput(text=result.content).with_suggested_actions(
    SuggestedActions(
        to=[ctx.activity.from_.id],
        actions=[
            CardAction(
                type=CardActionType.IM_BACK,
                title="Thank you!",
                value="Thank you very much!",
            ),
        ],
    )
).add_ai_generated()
await ctx.send(message)
```

<!-- suggested-actions-submit-send-method -->

Use the `CardActionType.SUBMIT` suggested action type when you want the click to deliver a structured payload to your bot without posting a visible message on the user's behalf.

:::warning Experimental API
`CardActionType.SUBMIT`, `SuggestedActionSubmitInvokeActivity`, and `on_suggested_action_submit` are marked `@experimental("ExperimentalTeamsSuggestedAction")`. The platform feature will be generally available by end of summer 2026.
:::

<!-- suggested-actions-submit-send-code -->

```python
from microsoft_teams.api import MessageActivityInput
from microsoft_teams.api.models.card.card_action import CardAction
from microsoft_teams.api.models.card.card_action_type import CardActionType
from microsoft_teams.api.models.suggested_actions import SuggestedActions

reply = MessageActivityInput(text="Approve or reject the request:").with_suggested_actions(
    SuggestedActions(
        to=[],
        actions=[
            CardAction(type=CardActionType.SUBMIT, title="Approve", value={"vote": "approve"}),
            CardAction(type=CardActionType.SUBMIT, title="Reject", value={"vote": "reject"}),
        ],
    )
)
await ctx.send(reply)
```

<!-- suggested-actions-submit-handle-method -->

The click arrives as a typed `suggestedActions/submit` invoke. Register a handler with the `@app.on_suggested_action_submit` decorator and read the payload from `ctx.activity.value`.

<!-- suggested-actions-submit-handle-code -->

```python
import json
from microsoft_teams.api.activities.invoke.suggested_action_submit import SuggestedActionSubmitInvokeActivity
from microsoft_teams.apps import ActivityContext

@app.on_suggested_action_submit
async def handle_suggested_action_submit(ctx: ActivityContext[SuggestedActionSubmitInvokeActivity]) -> None:
    payload = json.dumps(ctx.activity.value)
    await ctx.send(f"Got vote: {payload}")
```
