<!-- imports -->

N/A

<!-- project-structure -->

```
Quote.Agent/
|── appPackage/       # Teams app package files
├── Program.cs        # Main application startup code
```

<!-- project-structure-description -->

- **appPackage/**: Contains the Teams app package files, including the `manifest.json` file and icons. This is required for [sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) the app into Teams for testing. The app manifest defines the app's metadata, capabilities, and permissions.

<!-- app-class-code -->

```csharp title="Program.cs"
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Extensions;
using Microsoft.Teams.Plugins.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.AddTeams().AddTeamsDevTools();
var app = builder.Build();
var teams = app.UseTeams();

teams.OnMessage(async context =>
{
    await context.Typing();
    await context.Send($"you said '{context.Activity.Text}'");
});

app.Run();
```

<!-- plugin-events -->

(onActivity, onActivitySent, etc.)

<!-- message-handling-code -->

```csharp title="Program.cs"
teams.OnMessage(async context =>
{
    await context.Typing();
    await context.Send($"you said \"{context.activity.Text}\"");
});
```


<!-- message-handling-step1 -->

Listens for all incoming messages using `onMessage` handler.

<!-- message-handling-step3 -->

Responds by echoing back the received message.

<!-- message-handling-info -->

:::info
Each activity type has both an attribute and a functional method for type safety/simplicity
of routing logic!
:::

<!-- app-lifecycle-code -->

```csharp
var app = builder.Build();
app.UseTeams();
app.Run();
```
