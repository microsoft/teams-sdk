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

            var teams = app.UseTeams();
            app.Run();
        }

        teams.OnMessage(async context =>
        {
            await context.Client.Typing();
            await context.Client.Send($"hi from teams...");
        });
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