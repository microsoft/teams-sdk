<!-- reactive -->

```python
from microsoft_teams.api import MessageActivity
from microsoft_teams.apps import ActivityContext, App

app = App()


@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]) -> None:
    agentic_user = ctx.activity.recipient.agentic_user
    if agentic_user is None:
        raise RuntimeError("The activity is not addressed to an Agentic User.")

    await ctx.reply(
        f"Hi! I'm an Agentic User, and my user ID is "
        f"{agentic_user.agentic_user_id}. Nice to meet you!"
    )
```

<!-- reaction -->

```python
@app.on_message
async def react_to_message(ctx: ActivityContext[MessageActivity]) -> None:
    await ctx.api.reactions.add(
        ctx.activity.conversation.id,
        ctx.activity.id,
        "like",
    )
```

<!-- proactive -->

```python
agentic_user = app.get_agentic_user(
    agentic_app_instance_id,
    agentic_user_id,
    tenant_id=tenant_id,
)

await app.send(
    conversation_id,
    "Your scheduled update is ready.",
    agentic_identity=agentic_user,
)

api = app.api.from_agentic_identity(agentic_user)

await api.reactions.add(conversation_id, activity_id, "like")
```
