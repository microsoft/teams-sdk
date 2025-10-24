<!-- intro -->

You are able to convert any `App` into an MCP server by using the `McpPlugin` from the `microsoft-teams-mcp` package. This plugin adds the necessary endpoints to your application to serve as an MCP server. The plugin allows you to define tools, resources, and prompts that can be exposed to other MCP applications.

<!-- install -->

<!-- configuration -->

Your plugin can be configured as follows:

```python
from microsoft.teams.ai import Function
from microsoft.teams.mcpplugin import McpServerPlugin
from pydantic import BaseModel
# ...

# Configure MCP server with custom name
mcp_server_plugin = McpServerPlugin(
    name="test-mcp",
)

class EchoParams(BaseModel):
    input: str

async def echo_handler(params: EchoParams) -> str:
    return f"You said {params.input}"

# Register the echo tool
mcp_server_plugin.use_tool(
    Function(
        name="echo",
        description="echo back whatever you said",
        parameter_schema=EchoParams,
        handler=echo_handler,
    )
)
```

<!-- path-note -->

:::note
By default, the MCP server will be available at `/mcp` on your application. You can change this by setting the `path` property in the plugin configuration.
:::

<!-- app-integration -->

And included in the app like any other plugin:

```python
from microsoft.teams.apps import App
from microsoft.teams.devtools import DevToolsPlugin
# ...

app = App(plugins=[mcp_server_plugin, DevToolsPlugin()])
```

<!-- devtools-tip -->

:::tip
You may use the [MCP-Inspector](https://modelcontextprotocol.io/legacy/tools/inspector) to test functionality with your server.
:::

<!-- devtools-gif -->

![MCP Server in Devtools](/screenshots/mcp-inspector.gif)

<!-- proactive-messaging -->

**Alert Tool for Proactive Messaging:**

```python
from typing import Dict
from microsoft.teams.ai import Function
from microsoft.teams.mcpplugin import McpServerPlugin
from pydantic import BaseModel
# ...

# Storage for conversation IDs (for proactive messaging)
conversation_storage: Dict[str, str] = {}

class AlertParams(BaseModel):
    user_id: str
    message: str

async def alert_handler(params: AlertParams) -> str:
    """
    Send proactive message to user via Teams.
    This demonstrates the "piping messages to user" feature.
    """
    # 1. Validate if the incoming request is allowed to send messages
    if not params.user_id or not params.message:
        return "Invalid parameters: user_id and message are required"

    # 2. Fetch the correct conversation ID for the given user
    conversation_id = conversation_storage.get(params.user_id)
    if not conversation_id:
        return f"No conversation found for user {params.user_id}. User needs to message the bot first."

    # 3. Send proactive message to the user
    await app.send(conversation_id=conversation_id, activity=params.message)
    return f"Alert sent to user {params.user_id}: {params.message}"

# Register the alert tool
mcp_server_plugin.use_tool(
    Function(
        name="alert",
        description="Send proactive message to a Teams user",
        parameter_schema=AlertParams,
        handler=alert_handler,
    )
)
```

<!-- message-handler -->

**Store Conversation IDs in Message Handler:**

```python
from microsoft.teams.api import MessageActivity
from microsoft.teams.apps import ActivityContext
# ...

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    """
    Handle incoming messages and store conversation IDs for proactive messaging.
    """
    # Store conversation ID for this user (for proactive messaging)
    user_id = ctx.activity.from_.id
    conversation_id = ctx.activity.conversation.id
    conversation_storage[user_id] = conversation_id

    # Echo back the message with info about stored conversation
    await ctx.reply(
        f"You said: {ctx.activity.text}\n\n"
        f"📝 Stored conversation ID `{conversation_id}` for user `{user_id}` "
        f"(for proactive messaging via MCP alert tool)"
    )
```
