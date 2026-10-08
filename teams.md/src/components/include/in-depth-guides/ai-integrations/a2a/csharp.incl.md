<!-- intro -->

This guide is based on [`core/samples/A2ABot`](https://github.com/microsoft/teams.net/tree/main/core/samples/A2ABot): two SDK 2.1 bots run the same code with different config and hand users off through A2A.

<!-- agent-card -->

The sample publishes an A2A `AgentCard` per bot:

```csharp
public static AgentCard Build(Config config) => new()
{
    Name = config.Name,
    Description = config.Description,
    SupportedInterfaces =
    [
        new AgentInterface
        {
            Url = $"{config.SelfUrl}/a2a",
            ProtocolBinding = "JSONRPC",
            ProtocolVersion = "1.0",
        }
    ],
    Skills =
    [
        new AgentSkill
        {
            Id = "handoff",
            Name = "Handoff",
            Description = $"Accepts handoffs of users from peer bots. Specialty: {config.Description}",
        }
    ],
};
```

<!-- message-contract -->

Use a strict handoff payload contract:

```csharp
internal record HandoffMessage(
    string Kind,
    string AadObjectId,
    string UserName,
    string Summary,
    string From,
    string TenantId,
    string ServiceUrl);
```

<!-- handoff-tool -->

The model gets one handoff tool that calls A2A:

```csharp
AIFunction handoffTool = AIFunctionFactory.Create(HandoffToPeerAsync, new AIFunctionFactoryOptions
{
    Name = "handoff_to_peer",
    Description = $"Hand off the current user to {_config.PeerName} when {_config.PeerName}'s expertise is a better fit.",
});
```

Then send structured handoff data:

```csharp
await _a2aClient.SendHandoffAsync(
    new HandoffMessage("handoff", turn.AadObjectId, turn.UserName, summary, _config.Name, turn.TenantId, turn.ServiceUrl),
    ct);
```

<!-- a2a-client -->

The outbound client resolves and caches the peer card once:

```csharp
A2ACardResolver resolver = new(new Uri(config.PeerUrl), http);
AgentCard card = await resolver.GetAgentCardAsync(ct);
global::A2A.A2AClient client = new(new Uri(card.SupportedInterfaces[0].Url), http);
```

Then posts the handoff as a `Data` part.

<!-- a2a-server -->

Inbound A2A creates a 1:1 conversation and sends a proactive greeting:

```csharp
CreateConversationResponse conv = await conversations.CreateConversationAsync(
    new ConversationParameters
    {
        IsGroup = false,
        TenantId = handoff.TenantId,
        Members = [new TeamsChannelAccount { Id = handoff.AadObjectId }],
    },
    serviceUrl,
    cancellationToken: ct);

string greeting = await agent.GreetWithHandoffAsync(newConvId, handoff.From, handoff.UserName, handoff.Summary, ct);
await conversations.SendActivityAsync(newConvId, new MessageActivityInput().WithText(greeting), serviceUrl, cancellationToken: ct);
```

<!-- wiring -->

Teams + A2A are hosted in one ASP.NET app:

```csharp
builder.Services.AddTeamsBotApplication();
builder.Services.AddA2AAgent<A2AServer>(agentCard);

WebApplication webApp = builder.Build();
TeamsBotApplication teamsApp = webApp.UseTeamsBotApplication();

webApp.MapA2A("/a2a");
webApp.MapWellKnownAgentCard(agentCard);
webApp.Run();
```
