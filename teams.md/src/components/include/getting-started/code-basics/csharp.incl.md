<!-- imports -->

N/A

<!-- project-structure -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```
QuoteAgent/
├── Program.cs        # Main application startup code
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

```
QuoteAgent/
├── Program.cs          # Application startup and activity handlers
├── appsettings.json    # Configuration (logging, AzureAd auth, etc.)
├── Properties/
│   └── launchSettings.TEMPLATE.json  # Local profile template with AzureAd placeholders
```

</TabItem>
</Tabs>

<!-- project-structure-description -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

- **Program.cs**: Contains the main application code and is the entry point for your application.

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

- **Program.cs**: The entry point. A standard ASP.NET Core app that registers the Teams application into DI and wires it into the request pipeline.
- **appsettings.json**: Standard ASP.NET Core configuration — logging levels and, when you deploy, the `AzureAd` section that holds your bot credentials.
- **Properties/launchSettings.TEMPLATE.json**: Sample local launch profile with `AzureAd` environment variable placeholders. Copy this to `launchSettings.json` when configuring local credentials.

</TabItem>
</Tabs>

<!-- app-class-code -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp title="Program.cs"
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Extensions;
using Microsoft.Teams.Plugins.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.AddTeams();
var app = builder.Build();
var teams = app.UseTeams();

teams.OnMessage(async (context, cancellationToken) =>
{
    await context.Typing(cancellationToken: cancellationToken);
    await context.Send($"you said '{context.Activity.Text}'", cancellationToken);
});

app.Run();
```

The app configuration includes a variety of options that allow you to customize its behavior, including controlling the underlying server, authentication, and other settings.

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

```csharp title="Program.cs"
using Microsoft.Teams.Apps;

WebApplicationBuilder builder = WebApplication.CreateSlimBuilder(args);
builder.Services.AddTeamsBotApplication();
WebApplication app = builder.Build();

TeamsBotApplication teams = app.UseTeamsBotApplication();

teams.OnMessage(async (context, cancellationToken) =>
{
    await context.TypingAsync(cancellationToken);
    await context.SendAsync($"you said '{context.Activity.Text}'", cancellationToken);
});

app.Run();
```

`AddTeamsBotApplication()` registers everything the SDK needs into dependency injection. `UseTeamsBotApplication()` wires it into the ASP.NET Core pipeline and maps the `POST /api/messages` endpoint. From there, you register handlers for the activity types you care about.

</TabItem>
</Tabs>

<!-- plugin-events -->

(onActivity, onActivitySent, etc.)

<!-- plugins-note -->

:::note[Removed in SDK 2.1]
Plugins have been removed in the 2.1 preview. Because your app is a standard ASP.NET Core app, extend it with regular **middleware** and **dependency injection** instead — for per-turn logic, implement `ITurnMiddleware` and register it with `teams.UseMiddleware(...)` (see [Listening to Activities](../essentials/on-activity)).
:::

<!-- local-test-note -->

To test your agent locally without sideloading into Teams, run the **[Microsoft 365 Agents Playground](/developer-tools/agents-playground)** alongside your agent. The playground is a separate CLI tool and does not require any change to your app code.

<!-- message-handling-code -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp title="Program.cs"
teams.OnMessage(async (context, cancellationToken) =>
{
    await context.TypingAsync(cancellationToken: cancellationToken);
    await context.SendAsync($"you said \"{context.Activity.Text}\"", cancellationToken);
});
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

```csharp title="Program.cs"
teams.OnMessage(async (context, cancellationToken) =>
{
    await context.TypingAsync(cancellationToken);
    await context.SendAsync($"you said \"{context.Activity.Text}\"", cancellationToken);
});
```

You can also match specific messages with a regular expression — `teams.OnMessage("(?i)^help$", ...)` only fires for a case-insensitive `help`.

</TabItem>
</Tabs>

<!-- message-handling-step1 -->

Listens for all incoming messages using the `OnMessage` handler.

<!-- message-handling-step3 -->

Responds by echoing back the received message.

<!-- message-handling-info -->

:::info
Each activity type has a dedicated handler method (`OnMessage`, `OnMessageReaction`, `OnMembersAdded`, and so on) for type-safe, readable routing.
:::

<!-- app-lifecycle-code -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
WebApplication app = builder.Build();
app.UseTeamsBotApplication();
app.Run();
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

```csharp
WebApplication app = builder.Build();
app.UseTeamsBotApplication();
app.Run();
```

</TabItem>
</Tabs>
