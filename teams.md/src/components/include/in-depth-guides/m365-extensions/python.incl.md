<!-- setup -->

Install the M365 Extensions package alongside the Microsoft Agents SDK:

```bash
pip install microsoft-teams-m365extensions
```

Add an Agents SDK host to your existing Teams SDK application, then replace your current `App` initialization with `use_teams_sdk`:

```python
from os import environ

from microsoft_agents.activity import load_configuration_from_env
from microsoft_agents.authentication.msal import MsalConnectionManager
from microsoft_agents.hosting.aiohttp import CloudAdapter
from microsoft_agents.hosting.core import AgentApplication, MemoryStorage, TurnState
from microsoft_agents.hosting.core.app import ApplicationOptions
from microsoft_teams.m365extensions import use_teams_sdk

agents_sdk_config = load_configuration_from_env(dict(environ))
connection_manager = MsalConnectionManager(**agents_sdk_config)
adapter = CloudAdapter(connection_manager=connection_manager)

agent_app = AgentApplication[TurnState](
    options=ApplicationOptions(storage=MemoryStorage(), adapter=adapter),
    connection_manager=connection_manager,
    **agents_sdk_config,
)

app = use_teams_sdk(agent_app, connection_manager)
```

<!-- targeted-message -->

```python
import re

from microsoft_teams.api import Account, MessageActivity, MessageActivityInput
from microsoft_teams.apps import ActivityContext


@app.on_message_pattern(re.compile(r"^targeted$", re.IGNORECASE))
async def targeted_message(ctx: ActivityContext[MessageActivity]):
    sender = ctx.activity.from_
    targeted = MessageActivityInput(
        text="This message is only visible to you."
    ).with_recipient(
        Account(id=sender.id, name=sender.name),
        is_targeted=True,
    )

    await ctx.send(targeted)
```

<!-- targeted-message-sample-link -->

[Python targeted messages sample](https://github.com/microsoft/teams.py/tree/main/examples/targeted-messages)

<!-- agents-sdk-reaction -->

```python
import asyncio
import re

from microsoft_agents.hosting.core import TurnContext, TurnState
from microsoft_teams.api.clients.api_client import ApiClient
from microsoft_teams.m365extensions import is_teams_channel


@agent_app.message(re.compile(r"^agents sdk react$", re.IGNORECASE))
async def agents_sdk_reaction(context: TurnContext, _state: TurnState):
    if not is_teams_channel(context.activity):
        await context.send_activity(
            "Message reactions are only available in Teams."
        )
        return

    response = await context.send_activity("Adding then removing a reaction.")
    api = ApiClient(
        service_url=context.activity.service_url,
        options=app.api.http,
    )
    conversation_id = context.activity.conversation.id

    await api.conversations.add_reaction(conversation_id, response.id, "like")
    await asyncio.sleep(2)
    await api.conversations.delete_reaction(conversation_id, response.id, "like")
```

<!-- m365-extensions-sample-link -->

[Python M365 Extensions sample](https://github.com/microsoft/teams.py/tree/main/examples/m365extensions)