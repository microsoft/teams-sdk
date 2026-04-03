<!-- example -->

<Tabs groupId="user-auth">
  <TabItem value="BotBuilder">
    ```csharp showLineNumbers
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Builder.Dialogs;
    using Microsoft.Bot.Schema;

    public class MyActivityHandler : TeamsActivityHandler
    {
        private readonly ConversationState _conversationState;
        private readonly UserState _userState;
        private readonly Dialog _dialog;

        public MyActivityHandler(string connectionName, ConversationState conversationState, UserState userState)
        {
            _conversationState = conversationState;
            _userState = userState;
            _dialog = new SignInDialog("signin", connectionName);
        }

        protected override async Task OnMessageActivityAsync(
            ITurnContext<IMessageActivity> turnContext,
            CancellationToken cancellationToken)
        {
            await _dialog.RunAsync(turnContext, _conversationState.CreateProperty<DialogState>("DialogState"), cancellationToken);
        }

        public override async Task OnTurnAsync(ITurnContext turnContext, CancellationToken cancellationToken = default)
        {
            await base.OnTurnAsync(turnContext, cancellationToken);
            await _conversationState.SaveChangesAsync(turnContext, false, cancellationToken);
            await _userState.SaveChangesAsync(turnContext, false, cancellationToken);
        }
    }

    public class SignInDialog : ComponentDialog
    {
        private readonly string _connectionName;

        public SignInDialog(string id, string connectionName) : base(id)
        {
            _connectionName = connectionName;

            AddDialog(new OAuthPrompt("OAuthPrompt", new OAuthPromptSettings
            {
                ConnectionName = connectionName,
                Text = "Please Sign In",
                Title = "Sign In",
                Timeout = 300000
            }));

            AddDialog(new WaterfallDialog("Main", new WaterfallStep[]
            {
                PromptStepAsync,
                LoginStepAsync
            }));

            InitialDialogId = "Main";
        }

        private async Task<DialogTurnResult> PromptStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            return await stepContext.BeginDialogAsync("OAuthPrompt", null, cancellationToken);
        }

        private async Task<DialogTurnResult> LoginStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            await stepContext.Context.SendActivityAsync("You have been signed in.", cancellationToken: cancellationToken);
            return await stepContext.EndDialogAsync(null, cancellationToken);
        }
    }

    var storage = new MemoryStorage();
    var conversationState = new ConversationState(storage);
    var userState = new UserState(storage);
    var handler = new MyActivityHandler(
        builder.Configuration["ConnectionName"],
        conversationState,
        userState
    );
    ```

  </TabItem>
  <TabItem value="Teams SDK">
    ```csharp showLineNumbers
    using Microsoft.Teams.Apps;

    var builder = WebApplication.CreateBuilder(args);
    var appBuilder = App.Builder().AddOAuth("ConnectionName");
    var app = builder.Build();
    var teams = app.UseTeams();

    teams.OnMessage("/signout", async (context, cancellationToken) =>
    {
        if (!context.IsSignedIn) return;
        await context.SignOut(cancellationToken);
        await context.Send("You have been signed out.", cancellationToken);
    });

    teams.OnMessage(async (context, cancellationToken) =>
    {
        if (!context.IsSignedIn)
        {
            await context.SignIn(cancellationToken);
            return;
        }
    });

    teams.OnSignIn(async (_, @event, cancellationToken) =>
    {
        await context.Send("You have been signed in.", cancellationToken);
    });

    app.Run()
    ```

  </TabItem>
</Tabs>
