<!-- install -->

```bash
pip install microsoft-teams-m365extensions
```

<!-- wiring -->

```python
from microsoft_agents.hosting.core.app import AgentApplication
from microsoft_agents.hosting.core.storage import MemoryStorage
from microsoft_teams.m365extensions import use_teams_sdk

# Your existing Agents SDK app, unchanged.
agent_app = AgentApplication(storage=MemoryStorage(), adapter=adapter)

# Borrows agent_app's identity/token provider and installs the routing middleware.
teams_app = use_teams_sdk(agent_app, adapter.connection_manager)


# Register Teams SDK routes as usual.
@teams_app.on_message(r"^help$")
async def on_help(context):
    await context.send("This reply is handled entirely by the Teams SDK.")
```

<!-- is-teams-channel -->

```python
from microsoft_teams.m365extensions import is_teams_channel


@agent_app.on_message(r"^channel$")
async def on_channel(context):
    via = "Teams turn, no matching route" if is_teams_channel(context.activity) else "non-Teams channel"
    await context.send_activity(f"channelId={context.activity.channel_id} ({via})")
```

<!-- bypass -->

```python
from microsoft_agents.activity import ActivityTypes


def agent_sdk_owns_sign_in(context) -> bool:
    return (
        context.activity.type == ActivityTypes.invoke
        and (context.activity.name or "").lower().startswith("signin/")
    )


# signin/* invokes always stay on the Agents SDK auth pipeline.
teams_app = use_teams_sdk(agent_app, adapter.connection_manager, should_bypass_teams=agent_sdk_owns_sign_in)
```

<!-- host-context -->

N/A
