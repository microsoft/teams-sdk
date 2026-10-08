<!-- handlers -->

```python
from microsoft_teams.api import (
    AgenticUserDeletedActivity,
    AgenticUserDisabledActivity,
    AgenticUserEnabledActivity,
    AgenticUserIdentityCreatedActivity,
    AgenticUserIdentityUpdatedActivity,
    AgenticUserManagerUpdatedActivity,
    AgenticUserUndeletedActivity,
    AgenticUserWorkloadOnboardingUpdatedActivity,
    AgentLifecycleEventActivity,
)
from microsoft_teams.apps import ActivityContext


@app.on_agent_lifecycle
async def handle_lifecycle(
    ctx: ActivityContext[AgentLifecycleEventActivity],
) -> None:
    ctx.logger.info("Lifecycle event: %s", ctx.activity.value_type)

    # Continue so the matching typed handler can also run.
    await ctx.next()


@app.on_agentic_user_identity_created
async def handle_created(
    ctx: ActivityContext[AgenticUserIdentityCreatedActivity],
) -> None:
    ctx.logger.info("Agentic User created: %s", ctx.activity.value.agentic_user_id)


@app.on_agentic_user_identity_updated
async def handle_identity_updated(
    ctx: ActivityContext[AgenticUserIdentityUpdatedActivity],
) -> None:
    ctx.logger.info(
        "Agentic User identity updated: %s",
        ctx.activity.value.updated_property,
    )


@app.on_agentic_user_manager_updated
async def handle_manager_updated(
    ctx: ActivityContext[AgenticUserManagerUpdatedActivity],
) -> None:
    ctx.logger.info("Agentic User manager updated: %s", ctx.activity.value.manager)


@app.on_agentic_user_enabled
async def handle_enabled(
    ctx: ActivityContext[AgenticUserEnabledActivity],
) -> None:
    ctx.logger.info("Agentic User enabled: %s", ctx.activity.value.agentic_user_id)


@app.on_agentic_user_disabled
async def handle_disabled(
    ctx: ActivityContext[AgenticUserDisabledActivity],
) -> None:
    ctx.logger.info("Agentic User disabled: %s", ctx.activity.value.agentic_user_id)


@app.on_agentic_user_deleted
async def handle_deleted(
    ctx: ActivityContext[AgenticUserDeletedActivity],
) -> None:
    ctx.logger.info("Agentic User deleted: %s", ctx.activity.value.deletion_reason)


@app.on_agentic_user_undeleted
async def handle_undeleted(
    ctx: ActivityContext[AgenticUserUndeletedActivity],
) -> None:
    ctx.logger.info("Agentic User restored: %s", ctx.activity.value.agentic_user_id)


@app.on_agentic_user_workload_onboarding_updated
async def handle_workload_onboarding_updated(
    ctx: ActivityContext[AgenticUserWorkloadOnboardingUpdatedActivity],
) -> None:
    ctx.logger.info(
        "Agentic User workload onboarding updated: %s (%s)",
        ctx.activity.value.workload_name,
        ctx.activity.value.workload_onboarding_state,
    )
```
