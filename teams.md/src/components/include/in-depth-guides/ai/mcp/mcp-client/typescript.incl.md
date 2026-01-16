<!-- protocol-name -->

Streamable HTTP protocol

<!-- install -->

Install it to your application:

```bash
npm install @microsoft/teams.mcpclient
```

<!-- remote-protocol -->

Streamable HTTP/SSE

<!-- server-setup -->

valid remote

<!-- auth-requirements -->

and keys

<!-- plugin-class -->

`MCPClientPlugin` (from `@microsoft/teams.mcpclient` package)

<!-- integration-method -->

object as a plugin

<!-- send-method -->

`send`

<!-- basic-example -->

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
    instructions: 'You are a helpful assistant. You MUST use tool calls to do all your work.',
    model: new OpenAIChatModel({
      model: 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY,
    }),
  },
  [new McpClientPlugin({ logger })]
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

<!-- multiple-servers -->

In this example, we augment the `ChatPrompt` with a few remote MCP Servers.

<!-- custom-headers -->

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

<!-- mcp-server-note -->

:::note
Feel free to build an MCP Server in a different agent using the [MCP Server Guide](./mcp-server). Or you can quickly set up an MCP server using [Azure Functions](https://techcommunity.microsoft.com/blog/appsonazureblog/build-ai-agent-tools-using-remote-mcp-with-azure-functions/4401059).
:::

<!-- example-gif -->

![Animated image of user typing a prompt ('Tell me about Charizard') to DevTools Chat window and multiple paragraphs of information being returned.](/screenshots/mcp-client-pokemon.gif)

<!-- pokemon-example -->

In this example, our MCP server is a Pokemon API and our client knows how to call it. The LLM is able to call the `getPokemon` function exposed by the server and return the result back to the user.
