<!-- content -->

A BotBuilder `ActivityHandler` is similar to the activity routing of the Teams SDK `App`.
The `BotBuilderPlugin` accepts a botbuilder Activity Handler instance so you can keep using your
existing activity handlers while migrating however many you want to new Teams SDK handlers. This allows for
a more incremental migration strategy.

:::info
this snippet shows how to use the `BotBuilderPlugin` to route activities using botbuilder alongside the default Teams SDK activity routing.
:::

<Tabs>
  <TabItem value="Program.cs" default>
    ```csharp
    using Microsoft.Teams.Apps;
    using Microsoft.Teams.Plugins.AspNetCore.BotBuilder;

    var builder = WebApplication.CreateBuilder(args);

    // Add the BotBuilder plugin
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
