<!-- imports -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<!-- project-structure -->

```
Quote.Agent/
|── appPackage/       # Teams app package files
├── Program.cs        # Main application startup code
├── MainController.cs # Main activity handling code
```

<!-- project-structure-description -->

- **appPackage/**: Contains the Teams app package files, including the `manifest.json` file and icons. This is required for [sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) the app into Teams for testing. The app manifest defines the app's metadata, capabilities, and permissions.

<!-- app-class-code -->

```csharp title="Program.cs"
using Microsoft.Teams.Plugins.AspNetCore.DevTools.Extensions;
using Microsoft.Teams.Plugins.AspNetCore.Extensions;

using Quote.Agent;

var builder = WebApplication.CreateBuilder(args);
builder.AddTeams();
builder.AddTeamsDevTools();
builder.Services.AddTransient<MainController>();

var app = builder.Build();
app.UseTeams();
app.Run();
```

<!-- plugin-events -->

(onActivity, onActivitySent, etc.)

<!-- message-handling-code -->

<Tabs>
  <TabItem label="Controller" value="controller" default>
    ```csharp title="MainController.cs"
    [TeamsController("main")]
    public class MainController
    {
        [Message]
        public async Task OnMessage([Context] MessageActivity activity, [Context] IContext.Client client)
        {
            await client.Typing();
            await client.Send($"you said \"{activity.Text}\"");
        }
    }
    ```
  </TabItem>
  <TabItem label="Minimal" value="minimal">
    ```csharp title="Program.cs"
    app.OnMessage(async context =>
    {
        await context.Typing();
        await context.Send($"you said \"{context.activity.Text}\"");
    });
    ```
  </TabItem>
</Tabs>

<!-- message-handling-step1 -->

Listens for all incoming messages using `[Message]` attribute.

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
