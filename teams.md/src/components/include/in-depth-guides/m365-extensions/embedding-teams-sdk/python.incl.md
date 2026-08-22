<!-- install -->

```bash
pip install microsoft-teams-m365extensions
```

<!-- wiring -->

```python
from microsoft_agents.authentication.msal import MsalConnectionManager
from microsoft_agents.hosting.aiohttp import CloudAdapter
from microsoft_agents.hosting.core import AgentApplication, MemoryStorage
from microsoft_agents.hosting.core.app import ApplicationOptions
from microsoft_teams.m365extensions import use_teams_sdk

connection_manager = MsalConnectionManager(**agents_sdk_config)
adapter = CloudAdapter(connection_manager=connection_manager)

# Your existing Agents SDK app, unchanged.
agent_app = AgentApplication(
    options=ApplicationOptions(storage=MemoryStorage(), adapter=adapter),
    connection_manager=connection_manager,
)

# Borrows the connection manager's identity/token provider and installs the middleware.
teams_app = use_teams_sdk(agent_app, connection_manager)


# Register Teams SDK routes as usual.
@teams_app.on_message_pattern("^help$")
async def on_help(ctx):
    await ctx.send("This reply is handled entirely by the Teams SDK.")
```

<!-- is-teams-channel -->

```python
import re

from microsoft_teams.m365extensions import is_teams_channel


@agent_app.message(re.compile(r"^channel$"))
async def on_channel(context, state):
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
teams_app = use_teams_sdk(agent_app, connection_manager, agent_sdk_owns_sign_in)
```

<!-- host-context -->

The Python package keeps the host `TurnContext` in an internal context variable for the duration of a bridged turn, but it does not expose a public accessor for it. To reach host-only facilities — the Agents SDK's own authorization handlers or state — register that behavior on your `AgentApplication` routes rather than inside a Teams SDK handler.
