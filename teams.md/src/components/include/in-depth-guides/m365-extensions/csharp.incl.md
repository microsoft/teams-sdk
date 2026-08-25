<!-- setup -->

Install the M365 Extensions package alongside the Microsoft 365 Agents SDK:

```bash
dotnet add package Microsoft.Teams.M365Extensions
```

Register your existing Teams SDK bot as middleware on your Agents SDK `AgentApplication` with a single call. `AddTeamsSdk` reuses the Agents SDK connection identity, so you don't configure a second set of credentials:

```csharp
using Microsoft.Agents.Storage;
using Microsoft.Teams.M365Extensions;

var builder = WebApplication.CreateBuilder(args);

// Your existing Microsoft Agents SDK agent
builder.AddAgent<MyAgent>();
builder.Services.AddSingleton<IStorage, MemoryStorage>();
builder.Services.AddAgentAspNetAuthentication(builder.Configuration);

// Embed your Teams SDK bot as middleware in the Agents SDK pipeline
builder.Services.AddTeamsSdk<MyTeamsBot>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
app.MapAgentApplicationEndpoints(requireAuth: !app.Environment.IsDevelopment());

app.Run();
```

<!-- targeted-message -->

```csharp
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Clients;
using Microsoft.Teams.Apps.Schema;

public class MyTeamsBot : TeamsBotApplication
{
    public MyTeamsBot(ApiClient api, IHttpContextAccessor accessor, ILogger<MyTeamsBot> logger, TeamsBotApplicationOptions? options = null)
        : base(api, accessor, logger, options)
    {
        OnMessage("targeted", async (context, ct) =>
        {
            var sender = context.Activity.From;
            var targeted = new MessageActivityInput()
                .WithText("This message is only visible to you.")
                .WithRecipient(new TeamsChannelAccount { Id = sender!.Id, Name = sender.Name }, isTargeted: true);

            await context.SendAsync(targeted, ct);
        });
    }
}
```

<!-- targeted-message-sample-link -->

[targeted message handler in the .NET M365 Extensions sample](https://github.com/microsoft/teams.net/blob/9361517c6162132f74e0fed9373f5983a56cbaa8/samples/M365ExtensionsBot/MyTeamsBot.cs#L53)

<!-- cross-channel -->

```csharp
using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Builder.State;
using Microsoft.Teams.Apps.Schema;
using Microsoft.Teams.Core.Schema;
using Microsoft.Teams.M365Extensions;

// Registered on your Agents SDK AgentApplication (MyAgent), which sees every channel.
private async Task ReactInTeamsAsync(ITurnContext turnContext, ITurnState turnState, CancellationToken ct)
{
    if (!TeamsSdkMiddleware.IsTeamsChannel(turnContext.Activity))
    {
        await turnContext.SendActivityAsync("Message reactions are only available in Teams.", cancellationToken: ct);
        return;
    }

    var response = await turnContext.SendActivityAsync("Adding then removing a reaction.", cancellationToken: ct);

    // Reuse the bridged Teams SDK API client with the same identity and tokens the bridge established.
    var api = _teamsBot.Api.ForServiceUrl(new Uri(turnContext.Activity.ServiceUrl));
    string conversationId = turnContext.Activity.Conversation.Id;

    await api.Conversations.AddReactionAsync(conversationId, response!.Id, ReactionTypes.Like, cancellationToken: ct);
    await Task.Delay(2000, ct);
    await api.Conversations.DeleteReactionAsync(conversationId, response.Id, ReactionTypes.Like, cancellationToken: ct);
}
```

The same bridged API client lets an Agents SDK handler deliver *to* Teams even when the inbound activity arrived on another channel. Given a saved Teams conversation reference, proactively post into that Teams conversation with `CreateActivityAsync`:

```csharp
// e.g. inbound activity came from Outlook/email; deliver an update into a Teams conversation.
var teamsApi = _teamsBot.Api.ForServiceUrl(new Uri(teamsServiceUrl));
var outgoing = new MessageActivityInput().WithText("Update from your agent, delivered in Teams.");

await teamsApi.Conversations.CreateActivityAsync(teamsConversationId, outgoing, cancellationToken: ct);
```

<!-- cross-channel-sample-link -->

[reaction handler in the .NET M365 Extensions sample](https://github.com/microsoft/teams.net/blob/9361517c6162132f74e0fed9373f5983a56cbaa8/samples/M365ExtensionsBot/MyAgent.cs#L75)

<!-- m365-extensions-sample-link -->

[.NET M365 Extensions sample](https://github.com/microsoft/teams.net/tree/main/samples/M365ExtensionsBot)
