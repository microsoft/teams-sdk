<!-- install -->

```xml
<PackageReference Include="Microsoft.Teams.M365Extensions" Version="*" />
```

<!-- wiring -->

```csharp
using Microsoft.Teams.M365Extensions;

// Your existing Agents SDK registration, unchanged.
builder.AddAgent<MyAgent>();

// Registers the Teams SDK bot, bridges its outbound auth through the Agents SDK
// connection manager, and installs the routing middleware on the CloudAdapter.
builder.Services.AddTeamsSdk<MyTeamsBot>();
```

```csharp
// MyTeamsBot.cs — register Teams SDK routes as usual.
public class MyTeamsBot : TeamsBotApplication
{
    public MyTeamsBot(IServiceProvider services) : base(services)
    {
        OnMessage("help", async context =>
        {
            await context.Send("This reply is handled entirely by the Teams SDK.");
        });
    }
}
```

<!-- is-teams-channel -->

```csharp
using Microsoft.Teams.M365Extensions;

agent.OnMessage("channel", async (turnContext, turnState, cancellationToken) =>
{
    var via = TeamsSdkMiddleware.IsTeamsChannel(turnContext.Activity)
        ? "Teams turn, no matching route"
        : "non-Teams channel";
    await turnContext.SendActivityAsync($"channelId={turnContext.Activity.ChannelId} ({via})", cancellationToken: cancellationToken);
});
```

<!-- bypass -->

```csharp
using Microsoft.Agents.Core.Models;

// signin/* invokes always stay on the Agents SDK auth pipeline.
builder.Services.AddTeamsSdk<MyTeamsBot>(shouldBypassTeams: turnContext =>
    turnContext.Activity.Type == ActivityTypes.Invoke
    && !string.IsNullOrEmpty(turnContext.Activity.Name)
    && turnContext.Activity.Name.StartsWith("signin/", StringComparison.OrdinalIgnoreCase));
```

<!-- host-context -->

N/A
