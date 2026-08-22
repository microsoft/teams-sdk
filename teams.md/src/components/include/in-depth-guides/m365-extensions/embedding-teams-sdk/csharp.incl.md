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
// MyTeamsBot.cs — TeamsBotApplication resolves its dependencies from DI; register routes in the constructor.
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Clients;

public class MyTeamsBot : TeamsBotApplication
{
    public MyTeamsBot(
        ApiClient api,
        IHttpContextAccessor accessor,
        ILogger<MyTeamsBot> logger,
        TeamsBotApplicationOptions? options = null)
        : base(api, accessor, logger, options)
    {
        this.OnMessage("help", async (context, ct) =>
        {
            await context.SendAsync("This reply is handled entirely by the Teams SDK.", ct);
        });
    }
}
```

<!-- is-teams-channel -->

```csharp
using Microsoft.Teams.M365Extensions;

// Inside an Agents SDK route handler (ITurnContext turnContext, CancellationToken cancellationToken):
string via = TeamsSdkMiddleware.IsTeamsChannel(turnContext.Activity)
    ? "Teams turn, no matching route"
    : "non-Teams channel";

await turnContext.SendActivityAsync(
    $"channelId={turnContext.Activity.ChannelId} ({via})",
    cancellationToken: cancellationToken);
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

The .NET bridge tracks the host turn context internally but does not expose a public accessor. To reach host-only facilities, register that behavior on your `AgentApplication` (`MyAgent`) routes, or inject shared services into `MyTeamsBot` through its constructor.
