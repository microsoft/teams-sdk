<!-- example -->

<Tabs>
  <TabItem value="Program.cs" default>
    ```csharp

    using Microsoft.Bot.Builder.Integration.AspNet.Core;
    using Microsoft.Teams.Api.Activities;
    using Microsoft.Teams.Apps;
    using Microsoft.Teams.Apps.Activities;
    using Microsoft.Teams.Apps.Annotations;
    using Microsoft.Teams.Plugins.AspNetCore.Extensions;

    public static partial class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddTransient<Controller>();
            builder
                .AddTeams()
                // highlight-next-line
                .AddBotBuilder<Bot, BotBuilderAdapter, ConfigurationBotFrameworkAuthentication>();

            var app = builder.Build();

            app.UseTeams();
            app.Run();
        }

        [TeamsController]
        public class Controller
        {
            [Message]
            public async Task OnMessage([Context] MessageActivity activity, [Context] IContext.Client client, [Context] Microsoft.Teams.Common.Logging.ILogger log)
            {
                await client.Typing();
                await client.Send($"hi from teams...");
            }
        }
    }
    ```

  </TabItem>
  <TabItem value="BotBuilderAdapter.cs">
    ```csharp
    using Microsoft.Bot.Builder.Integration.AspNet.Core;
    using Microsoft.Bot.Connector.Authentication;

    // replace with your Adapter
    // highlight-start
    public class BotBuilderAdapter : CloudAdapter
    {
        public BotBuilderAdapter(BotFrameworkAuthentication auth, ILogger<IBotFrameworkHttpAdapter> logger)
            : base(auth, logger)
        {
            OnTurnError = async (turnContext, exception) =>
            {
                logger.LogError(exception, $"[OnTurnError] unhandled error : {exception.Message}");

                // Send a message to the user
                await turnContext.SendActivityAsync("The bot encountered an error or bug.");
            };
        }
    }
    // highlight-end
    ```

  </TabItem>
  <TabItem value="ActivityHandler.cs">
    ```csharp
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Schema;

    // replace with your ActivityHandler
    // highlight-start
    public class Bot : ActivityHandler
    {
        protected override async Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, CancellationToken cancellationToken)
        {
            var replyText = $"hi from botbuilder...";
            await turnContext.SendActivityAsync(MessageFactory.Text(replyText, replyText), cancellationToken);
        }
    }
    // highlight-end
    ```

  </TabItem>
</Tabs>

In this example:
- `BotBuilderAdapter` extends `CloudAdapter` to handle incoming activities, manage errors through `OnTurnError`, and provide middleware support.
- `Bot` (inheriting from ActivityHandler) contains the core bot logic, handling incoming messages and sending responses via the `ITurnContext`.
- `Program.cs` sets up a Teams SDK `app` and registers the `BotBuilderPlugin` with your `Bot` and `BotBuilderAdapter`. It also defines a Teams SDK controller that responds to messages.

In the ouptut below, 
The first line comes from the BotBuilder `ActivityHandler`. The second line comes from the Teams SDK controller.
This shows that both handlers can process the same message sequentially when using the `BotBuilderPlugin`.

```
hi from botbuilder...
hi from teams...
```
