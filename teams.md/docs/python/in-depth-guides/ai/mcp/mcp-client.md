---
sidebar_position: 2
summary: Guide to integrating remote MCP (Machine Conversation Protocol) servers into Teams applications, enabling AI agents to access external tools through SSE protocol, with practical examples of configuring the MCPClientPlugin.
---

# MCP Client

You are able to leverage other MCP servers that expose tools via the SSE protocol as part of your application. This allows your AI agent to use remote tools to accomplish tasks.

:::info
Take a look at [Function calling](../function-calling) to understand how the `ChatPrompt` leverages tools to enhance the LLM's capabilities. MCP extends this functionality by allowing remote tools, that may or may not be developed or maintained by you, to be used by your application.
:::

## Remote MCP Server

The first thing that's needed is access to a **remote** MCP server. MCP Servers (at present) come using two main types protocols:

1. StandardIO - This is a _local_ MCP server, which runs on your machine. An MCP client may connect to this server, and use standard input and outputs to communicate with it. Since our application is running remotely, this is not something that we want to use
2. StreamableHttp/SSE - This is a _remote_ MCP server. An MCP client may send it requests and the server responds in the expected MCP protocol.

For hooking up to your a valid SSE server, you will need to know the URL of the server, and if applicable, any keys that must be included as part of the header.

## MCP Client Plugin

The `McpClientPlugin` integrates directly with the `ChatPrompt` as a plugin. When the `ChatPrompt`'s `send` function is called, it calls the external MCP server and loads up all the tools that are available to it.

Once loaded, it treats these tools like any functions that are available to the `ChatPrompt` object. If the LLM then decides to call one of these remote MCP tools, the MCP Client plugin will call the remote MCP server and return the result back to the LLM. The LLM can then use this result in its response.

```python
from microsoft.teams.ai import ChatPrompt
from microsoft.teams.mcpplugin import McpClientPlugin
from microsoft.teams.openai import OpenAICompletionsAIModel
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

In this example, we augment the `ChatPrompt` with multiple remote MCP Servers.

## Authentication with Headers

Many MCP servers require authentication via headers (such as API keys or Bearer tokens). You can pass these headers when configuring your MCP server:

```python
from os import getenv
from microsoft.teams.mcpplugin import McpClientPlugin, McpClientPluginParams
# ...

# This example uses a PersonalAccessToken, but you may get
# the user's oauth token as well by getting them to sign in
# and then using app.sign_in to get their token.
GITHUB_PAT = getenv("GITHUB_PAT")

# MCP server with authentication headers
if GITHUB_PAT:
    mcp_plugin.use_mcp_server(
        "https://api.githubcopilot.com/mcp/",
        McpClientPluginParams(headers={
            "Authorization": f"Bearer {GITHUB_PAT}",
        })
    )

# Other authentication examples:
mcp_plugin.use_mcp_server(
    "https://example.com/api/mcp",
    McpClientPluginParams(headers={
        "X-API-Key": getenv('API_KEY'),
        "Custom-Header": "custom-value"
    })
)
```

Headers are passed with every request to the MCP server, enabling secure access to authenticated APIs.

## Using MCP Client in Message Handlers

```python
from microsoft.teams.ai import ChatPrompt
from microsoft.teams.api import MessageActivity, MessageActivityInput
from microsoft.teams.apps import ActivityContext
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

:::note
Feel free to build an MCP Server in a different agent using the [MCP Server Guide](./mcp-server). Or you can quickly set up an MCP server using [Azure Functions](https://techcommunity.microsoft.com/blog/appsonazureblog/build-ai-agent-tools-using-remote-mcp-with-azure-functions/4401059).
:::

![Animated image of user typing a prompt ('Tell me about Charizard') to DevTools Chat window and multiple paragraphs of information being returned.](/screenshots/mcp-client-pokemon.gif)

In this example, our MCP server is a Pokemon API and our client knows how to call it. The LLM is able to call the `getPokemon` function exposed by the server and return the result back to the user.

