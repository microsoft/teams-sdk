<!-- protocol-name -->

SSE protocol

<!-- install -->

Install it to your application:

```bash
dotnet add package Microsoft.Teams.Plugins.External.McpClient --prerelease
```

<!-- remote-protocol -->

SSE

<!-- server-setup -->

a valid SSE

<!-- auth-requirements -->

and keys

<!-- plugin-class -->

`MCPClientPlugin` (from `Microsoft.Teams.Plugins.External.McpClient` package)

<!-- integration-method -->

object as a plugin

<!-- send-method -->

`send`

<!-- basic-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem label="Minimal" value="minimal">
    ```csharp
    using Microsoft.Teams.AI.Models.OpenAI;
    using Microsoft.Teams.AI.Prompts;
    using Microsoft.Teams.Api.Activities;
    using Microsoft.Teams.Apps;
    using Microsoft.Teams.Apps.Activities;
    using Microsoft.Teams.Plugins.AspNetCore.Extensions;
    using Microsoft.Teams.Plugins.External.McpClient;

    WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
    builder.AddTeams();
    WebApplication webApp = builder.Build();

    OpenAIChatPrompt prompt = new(
            new OpenAIChatModel(
                model: "gpt-4o",
                apiKey: Environment.GetEnvironmentVariable("OPENAI_API_KEY")!),
                new ChatPromptOptions()
                    .WithDescription("helpful assistant")
                    .WithInstructions(
                        "You are a helpful assistant that can help answer questions using Microsoft docs.",
                        "You MUST use tool calls to do all your work.")
                    );
    prompt.Plugin(new McpClientPlugin().UseMcpServer("https://learn.microsoft.com/api/mcp"));

    App app = webApp.UseTeams();
    app.OnMessage(async context =>
    {
        await context.Send(new TypingActivity());
        var result = await prompt.Send(context.Activity.Text);
        await context.Send(result.Content);
    });
    webApp.Run();
    ```

  </TabItem>
</Tabs>

<!-- multiple-servers -->

In this example, we augment the `ChatPrompt` with a remote MCP Server.

<!-- mcp-server-note -->

:::note
You can quickly set up an MCP server using [Azure Functions](https://techcommunity.microsoft.com/blog/appsonazureblog/build-ai-agent-tools-using-remote-mcp-with-azure-functions/4401059).
:::

<!-- custom-headers -->

### Custom Headers

Some MCP servers may require custom headers to be sent as part of the request. You can customize the headers when calling the `UseMcpServer` function:

```csharp
new McpClientPlugin()
    .UseMcpServer("https://learn.microsoft.com/api/mcp",
        new McpClientPluginParams()
        {
               HeadersFactory = () => new Dictionary<string, string>()
               { { "HEADER_KEY", "HEADER_VALUE" } }
        }
    );
```

<!-- example-gif -->

![Animated image of user typing a prompt ('Tell me about Charizard') to DevTools Chat window and multiple paragraphs of information being returned.](/screenshots/mcp-client-pokemon.gif)

<!-- pokemon-example -->

In this example, our MCP server is a Pokemon API and our client knows how to call it. The LLM is able to call the `getPokemon` function exposed by the server and return the result back to the user.
