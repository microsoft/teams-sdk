<!-- protocol-name -->

SSE protocol

<!-- install -->

Install it to your application:

```bash
uv add microsoft-teams-mcpplugin
```

<!-- remote-protocol -->

StreamableHttp/SSE

<!-- server-setup -->

a valid SSE

<!-- auth-requirements -->

any keys

<!-- plugin-class -->

`McpClientPlugin`

<!-- integration-method -->

as a plugin

<!-- send-method -->

`send`

<!-- basic-example -->

```python
from microsoft_teams.ai import ChatPrompt
from microsoft_teams.mcpplugin import McpClientPlugin
from microsoft_teams.openai import OpenAICompletionsAIModel
# ...

# Set up AI model
completions_model = OpenAICompletionsAIModel(model="gpt-4")

# Configure MCP Client Plugin with multiple remote servers
mcp_plugin = McpClientPlugin()

# Add multiple MCP servers
mcp_plugin.use_mcp_server("https://learn.microsoft.com/api/mcp")
mcp_plugin.use_mcp_server("https://example.com/mcp/weather")
mcp_plugin.use_mcp_server("https://example.com/mcp/pokemon")

# ChatPrompt with MCP tools
chat_prompt = ChatPrompt(
    completions_model,
    plugins=[mcp_plugin]
)
```

<!-- multiple-servers -->

In this example, we augment the `ChatPrompt` with multiple remote MCP Servers.

## Using MCP Client in Message Handlers

```python
from microsoft_teams.ai import ChatPrompt
from microsoft_teams.api import MessageActivity, MessageActivityInput
from microsoft_teams.apps import ActivityContext
# ...

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    """Handle messages using ChatPrompt with MCP tools"""

    result = await chat_prompt.send(
        input=ctx.activity.text,
        instructions="You are a helpful assistant with access to remote MCP tools."
    )

    if result.response.content:
        message = MessageActivityInput(text=result.response.content).add_ai_generated()
        await ctx.send(message)
```

<!-- custom-headers -->

### Customize Headers

Some MCP servers may require custom headers to be sent as part of the request. You can customize the headers when calling the `use_mcp_server` function:

```python
from os import getenv
from microsoft_teams.mcpplugin import McpClientPlugin, McpClientPluginParams
# ...

# Example with Bearer token authentication
GITHUB_PAT = getenv("GITHUB_PAT")

if GITHUB_PAT:
    mcp_plugin.use_mcp_server(
        "https://api.githubcopilot.com/mcp/",
        McpClientPluginParams(headers={
            "Authorization": f"Bearer {GITHUB_PAT}",
        })
    )

# Example with API key
mcp_plugin.use_mcp_server(
    "https://example.com/api/mcp",
    McpClientPluginParams(headers={
        "X-API-Key": getenv('API_KEY'),
        "Custom-Header": "custom-value"
    })
)
```

<!-- example-gif -->

![Animated image of user typing a prompt ('Tell me about Charizard') to DevTools Chat window and multiple paragraphs of information being returned.](/screenshots/mcp-client-pokemon.gif)

<!-- pokemon-example -->

In this example, our MCP server is a Pokemon API and our client knows how to call it. The LLM is able to call the `getPokemon` function exposed by the server and return the result back to the user.
