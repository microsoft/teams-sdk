<!-- prerequisites -->

- .NET 10 SDK
- The [Teams Developer CLI](/cli/)
- A development tunnel with a public HTTPS URL
- A Teams bot registration
- Either an Azure OpenAI deployment or an Anthropic API key

<!-- get-sample -->

```bash
git clone https://github.com/microsoft/teams.net.git
cd teams.net
dotnet restore samples/ExtAIBot/ExtAIBot.csproj
```

The working application is in `samples/ExtAIBot`.

<!-- register-app -->

```bash
npm install -g @microsoft/teams.cli
teams login
teams app create \
  --name "ext-ai-bot" \
  --endpoint "https://<your-tunnel>/api/messages" \
  --json
```

Configure the returned bot credentials through the standard `AzureAd` configuration section:

```bash
export AzureAd__TenantId=<tenant-id>
export AzureAd__ClientId=<client-id>
export AzureAd__ClientCredentials__0__SourceType=ClientSecret
export AzureAd__ClientCredentials__0__ClientSecret=<client-secret>
```

<!-- run-sample -->

```bash
dotnet run --project samples/ExtAIBot/ExtAIBot.csproj
```

<!-- provider-config -->

<Tabs groupId="ai-provider">
  <TabItem value="azure-openai" label="Azure OpenAI" default>

```bash
export AI_PROVIDER=azure-openai
export AzureOpenAI__Endpoint=https://<resource-name>.openai.azure.com
export AzureOpenAI__ApiKey=<api-key>
export AzureOpenAI__Deployment=<deployment-name>
```

  </TabItem>
  <TabItem value="anthropic" label="Anthropic Claude">

```bash
export AI_PROVIDER=anthropic
export ANTHROPIC_API_KEY=<api-key>
export ANTHROPIC_MODEL=<supported-claude-model>
```

  </TabItem>
</Tabs>

Keep API keys on the server. Both providers use the public Microsoft Learn MCP server.

<!-- provider-boundary -->

The Teams application consumes `IChatClient`; provider selection happens once during dependency injection:

```csharp
string provider = config["AI_PROVIDER"] ?? "azure-openai";
IChatClient client = provider switch
{
    "anthropic" => new AnthropicClient(new ClientOptions
    {
        ApiKey = config["ANTHROPIC_API_KEY"]
            ?? throw new InvalidOperationException("ANTHROPIC_API_KEY is required.")
    })
        .AsIChatClient(config["ANTHROPIC_MODEL"]
            ?? throw new InvalidOperationException("ANTHROPIC_MODEL is required.")),
    "azure-openai" => new AzureOpenAIClient(
            new Uri(config["AzureOpenAI:Endpoint"]
                ?? throw new InvalidOperationException("AzureOpenAI:Endpoint is required.")),
            new ApiKeyCredential(config["AzureOpenAI:ApiKey"]
                ?? throw new InvalidOperationException("AzureOpenAI:ApiKey is required.")))
        .GetChatClient(config["AzureOpenAI:Deployment"]
            ?? throw new InvalidOperationException("AzureOpenAI:Deployment is required."))
        .AsIChatClient(),
    _ => throw new InvalidOperationException($"Unsupported AI_PROVIDER '{provider}'."),
};

return client.AsBuilder().UseFunctionInvocation().Build();
```

`Agent`, `ExtAIBotApp`, MCP tools, streaming, citations, cards, and feedback remain provider-neutral.

<!-- sample-link -->

Browse the complete [`ExtAIBot` sample](https://github.com/microsoft/teams.net/tree/main/samples/ExtAIBot).
