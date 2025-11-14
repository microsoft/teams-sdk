<!-- example -->

<Tabs>
  <TabItem value="Program.cs" default>
    ```csharp
    using Microsoft.Teams.Apps;
    using Microsoft.Teams.Plugins.AspNetCore.BotBuilder;
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Builder.Integration.AspNet.Core;

    var builder = WebApplication.CreateBuilder(args);

    // Configure BotFramework Adapter
    builder.Services.AddSingleton<IBotFrameworkHttpAdapter, CloudAdapter>();
    builder.Services.AddSingleton<TeamsActivityHandler, MyActivityHandler>();
    builder.Services.AddSingleton<BotBuilderPlugin>();

    var app = builder.Build();

    // Configure Teams App with BotBuilder plugin
    // highlight-next-line
    var teamsApp = new TeamsApp(app.Services, new[] { app.Services.GetRequiredService<BotBuilderPlugin>() });

    teamsApp.OnMessage(async (context) =>
    {
        await context.SendAsync("hi from teams...");
    });

    await teamsApp.StartAsync();
    app.Run();
    ```

  </TabItem>
  <TabItem value="appsettings.json">
    ```json
    {
      "MicrosoftAppType": "MultiTenant",
      "MicrosoftAppId": "your-app-id",
      "MicrosoftAppPassword": "your-app-password",
      "MicrosoftAppTenantId": "your-tenant-id"
    }
    ```

  </TabItem>
  <TabItem value="MyActivityHandler.cs">
    ```csharp
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Schema;

    // replace with your TeamsActivityHandler
    // highlight-start
    public class MyActivityHandler : TeamsActivityHandler
    {
        protected override async Task OnMessageActivityAsync(
            ITurnContext<IMessageActivity> turnContext,
            CancellationToken cancellationToken)
        {
            await turnContext.SendActivityAsync("hi from botbuilder...", cancellationToken: cancellationToken);
        }
    }
    // highlight-end
    ```

  </TabItem>
</Tabs>

```
hi from botbuilder...
hi from teams...
```
