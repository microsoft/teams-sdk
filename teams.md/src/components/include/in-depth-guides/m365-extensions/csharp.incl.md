<!-- setup -->

Install the Microsoft 365 Extensions package alongside the Microsoft Agents SDK:

```bash
dotnet add package Microsoft.Agents.Hosting.AspNetCore
dotnet add package Microsoft.Agents.Authentication.Msal
dotnet add package Microsoft.Teams.M365Extensions
```

Add an Agents SDK host to your existing Teams SDK application, then register your Teams SDK bot with `AddTeamsSdk`:

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

<!-- channel-routing -->

```csharp
using Microsoft.Agents.Builder;
using Microsoft.Agents.Builder.State;
using Microsoft.Teams.M365Extensions;

private async Task ChannelAsync(ITurnContext context, ITurnState state, CancellationToken ct)
{
    string via = TeamsSdkMiddleware.IsTeamsChannel(context.Activity)
        ? "Teams turn with no matching teams.net route → fell through"
        : "non-Teams channel → passed straight through";
    await context.SendActivityAsync($"[Agent SDK] channelId={context.Activity.ChannelId} ({via})", cancellationToken: ct);
}
```

<!-- agents-sdk-reaction -->

```csharp
using Microsoft.Agents.Builder;
using Microsoft.Agents.Builder.State;
using Microsoft.Teams.Apps.Schema;
using Microsoft.Teams.M365Extensions;

private async Task AgentsSdkReactAsync(ITurnContext context, ITurnState state, CancellationToken ct)
{
    if (!TeamsSdkMiddleware.IsTeamsChannel(context.Activity))
    {
        await context.SendActivityAsync("Message reactions are only available in Teams.", cancellationToken: ct);
        return;
    }

    var response = await context.SendActivityAsync("Adding then removing a reaction.", cancellationToken: ct);
    var api = _teamsBot.Api.ForServiceUrl(new Uri(context.Activity.ServiceUrl));
    string conversationId = context.Activity.Conversation.Id;

    await api.Conversations.AddReactionAsync(conversationId, response!.Id, ReactionTypes.Like, cancellationToken: ct);
    await Task.Delay(2000, ct);
    await api.Conversations.DeleteReactionAsync(conversationId, response.Id, ReactionTypes.Like, cancellationToken: ct);
}
```
