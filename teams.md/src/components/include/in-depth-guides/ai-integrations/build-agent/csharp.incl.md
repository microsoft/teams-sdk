<!-- intro -->

This C# pattern is based on [`core/samples/ExtAIBot`](https://github.com/microsoft/teams.net/tree/main/core/samples/ExtAIBot): use SDK 2.1 (`Microsoft.Teams.Apps`) for Teams transport/routing, and plug AI orchestration through `IChatClient` + tools.

<!-- define-agent -->

Register Teams + chat client + agent services:

```csharp
WebApplicationBuilder builder = WebApplication.CreateSlimBuilder(args);
builder.Services.AddTeamsBotApplication<ExtAIBotApp>();

builder.Services.AddSingleton<IChatClient>(sp =>
{
    IConfiguration config = sp.GetRequiredService<IConfiguration>();
    string endpoint = config["AzureOpenAI:Endpoint"] ?? throw new InvalidOperationException("AzureOpenAI:Endpoint is required.");
    string apiKey = config["AzureOpenAI:ApiKey"] ?? throw new InvalidOperationException("AzureOpenAI:ApiKey is required.");
    string deployment = config["AzureOpenAI:Deployment"] ?? throw new InvalidOperationException("AzureOpenAI:Deployment is required.");

    return new AzureOpenAIClient(new Uri(endpoint), new ApiKeyCredential(apiKey))
        .GetChatClient(deployment)
        .AsIChatClient()
        .AsBuilder()
        .UseFunctionInvocation()
        .Build();
});

builder.Services.AddSingleton<Agent>();
```

<!-- local-tool -->

Create local tools that can emit clarification cards into the turn:

```csharp
ChatOptions options = new()
{
    Tools =
    [
        LocalTools.CreateClarificationCardTool(pendingCards, _logger),
        .. mcpTools.GetTools(citations)
    ]
};
```

`pendingCards` is checked after generation; if present, the final reply is card-only.

<!-- mcp-tools -->

Add MCP tools into the same tool list:

```csharp
builder.Services.AddSingleton<McpToolSetLifetimeService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<McpToolSetLifetimeService>());
```

At run time:

```csharp
McpToolSet mcpTools = _mcpTools.Value;
ChatOptions options = new() { Tools = [.. mcpTools.GetTools(citations)] };
```

<!-- running -->

Stream model output back to Teams with `TeamsStreamingWriter`:

```csharp
TeamsStreamingWriter writer = TeamsStreamingWriter.CreateFromContext(context);
await writer.SendInformativeUpdateAsync("Thinking…", cancellationToken);

await foreach (ChatResponseUpdate update in _chatClient.GetStreamingResponseAsync(history, options, cancellationToken))
{
    if (!string.IsNullOrEmpty(update.Text))
    {
        await writer.AppendResponseAsync(update.Text, cancellationToken);
        fullText.Append(update.Text);
    }
}
```

<!-- memory -->

Keep conversation history per Teams conversation:

```csharp
private readonly ConcurrentDictionary<string, List<ChatMessage>> _histories = new();
private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();
```

Each turn acquires a per-conversation lock before mutating history.

<!-- citations -->

Extract citation metadata from tool JSON results and map only used `[N]` references into Teams entities:

```csharp
foreach (Match match in Regex.Matches(fullText, @"\[(\d+)\]"))
{
    if (int.TryParse(match.Groups[1].Value, out int position))
        used.Add(position);
}

return claims.Count == 0
    ? [new OMessageEntity { AdditionalType = ["AIGeneratedContent"] }]
    : [new CitationEntity { AdditionalType = ["AIGeneratedContent"], Citation = claims }];
```
