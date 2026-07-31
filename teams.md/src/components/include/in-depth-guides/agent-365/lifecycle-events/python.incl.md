<!-- handlers -->

```python
from microsoft_teams.api import (
    AgenticUserDisabledActivity,
    AgenticUserIdentityCreatedActivity,
    AgentLifecycleEventActivity,
)
from microsoft_teams.apps import ActivityContext


@app.on_agent_lifecycle
async def handle_lifecycle(
    ctx: ActivityContext[AgentLifecycleEventActivity],
) -> None:
    logger.info("Lifecycle event: %s", ctx.activity.value_type)

    # Continue so the matching typed handler can also run.
    await ctx.next()


@app.on_agentic_user_identity_created
async def handle_created(
    ctx: ActivityContext[AgenticUserIdentityCreatedActivity],
) -> None:
    logger.info("Agentic User created: %s", ctx.activity.value.agentic_user_id)


@app.on_agentic_user_disabled
async def handle_disabled(
    ctx: ActivityContext[AgenticUserDisabledActivity],
) -> None:
    logger.info("Agentic User disabled: %s", ctx.activity.value.agentic_user_id)
```
