---
sidebar_position: 2
summary: How to implement an MCP client to leverage remote MCP servers and their tools in your AI agent application.
---

# MCP Client

You are able to leverage other MCP servers that expose tools via the Streamable HTTP protocol as part of your application. This allows your AI agent to use remote tools to accomplish tasks.

Install it to your application:

```bash
npm install @microsoft/teams.mcpclient
```

:::info
Take a look at [Function calling](../function-calling) to understand how the `ChatPrompt` leverages tools to enhance the LLM's capabilities. MCP extends this functionality by allowing remote tools, that may or may not be developed or maintained by you, to be used by your application.
:::

## Remote MCP Server

The first thing that's needed is access to a **remote** MCP server. MCP Servers (at present) come using two main types protocols:

1. StandardIO - This is a _local_ MCP server, which runs on your machine. An MCP client may connect to this server, and use standard input and outputs to communicate with it. Since our application is running remotely, this is not something that we want to use
2. Streamable HTTP/SSE - This is a _remote_ MCP server. An MCP client may send it requests and the server responds in the expected MCP protocol.

For hooking up to your valid remote server, you will need to know the URL of the server, and if applicable, and keys that must be included as part of the header.

## MCP Client Plugin

The `MCPClientPlugin` (from `@microsoft/teams.mcpclient` package) integrates directly with the `ChatPrompt` object as a plugin. When the `ChatPrompt`'s `send` function is called, it calls the external MCP server and loads up all the tools that are available to it.

Once loaded, it treats these tools like any functions that are available to the `ChatPrompt` object. If the LLM then decides to call one of these remote MCP tools, the MCP Client plugin will call the remote MCP server and return the result back to the LLM. The LLM can then use this result in its response.

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { McpClientPlugin } from '@microsoft/teams.mcpclient';
import { OpenAIChatModel } from '@microsoft/teams.openai';
// ...

const logger = new ConsoleLogger('mcp-client', { level: 'debug' });
const prompt = new ChatPrompt(
  {
    instructions:
      'You are a helpful assistant. You MUST use tool calls to do all your work.',
    model: new OpenAIChatModel({
      model: 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY,
    })
  },
  [new McpClientPlugin({ logger })],
).usePlugin('mcpClient', {
    url: 'https://learn.microsoft.com/api/mcp',
  });

const app = new App();

app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });

  const result = await prompt.send(activity.text);
  if (result.content) {
    await send(result.content);
  }
});
app.start().catch(console.error);
```

In this example, we augment the `ChatPrompt` with a few remote MCP Servers.

### Customize Headers

Some MCP servers may require custom headers to be sent as part of the request. You can customize the headers when calling the `usePlugin` function:

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';
import { McpClientPlugin } from '@microsoft/teams.mcpclient';
// ...

.usePlugin('mcpClient', {
    url: 'https://<your-mcp-server>/mcp'
    params: {
      headers: {
        'x-header-functions-key': '<custom-headers>',
      }
    }
});
```

:::note
Feel free to build an MCP Server in a different agent using the [MCP Server Guide](./mcp-server). Or you can quickly set up an MCP server using [Azure Functions](https://techcommunity.microsoft.com/blog/appsonazureblog/build-ai-agent-tools-using-remote-mcp-with-azure-functions/4401059).
:::

![Animated image of user typing a prompt ('Tell me about Charizard') to DevTools Chat window and multiple paragraphs of information being returned.](/screenshots/mcp-client-pokemon.gif)

In this example, our MCP server is a Pokemon API and our client knows how to call it. The LLM is able to call the `getPokemon` function exposed by the server and return the result back to the user.

