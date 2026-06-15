<!-- create-project -->

The Teams Developer CLI doesn't ship a `graph` template for C# yet (tracked in [microsoft/teams-sdk#2736](https://github.com/microsoft/teams-sdk/issues/2736)). Scaffold the `echo` template and add the OAuth wiring shown below by hand:

```sh
teams project new csharp oauth-app
```

<!-- configure-oauth -->

```cs
var builder = WebApplication.CreateBuilder(args);

var appBuilder = App.Builder()
    .AddOAuth("graph");

builder.AddTeams(appBuilder);
var app = builder.Build();
var teams = app.UseTeams();
```

<!-- signing-in -->

```cs
teams.OnMessage("/signin", async (context, cancellationToken) =>
{
    if (context.IsSignedIn)
    {
        await context.Send("you are already signed in!", cancellationToken);
        return;
    }
    else
    {
        await context.SignIn(cancellationToken);
    }
});
```

<!-- signin-event -->

```cs
teams.OnSignIn(async (_, teamsEvent, cancellationToken) =>
{
    var context = teamsEvent.Context;
    await context.Send($"Signed in using OAuth connection {context.ConnectionName}. Please type **/whoami** to see your profile or **/signout** to sign out.", cancellationToken);
});
```

<!-- using-graph -->

```cs
teams.OnMessage("/whoami", async (context, cancellationToken) =>
{
    if (!context.IsSignedIn)
    {
        await context.Send("you are not signed in!. Please type **/signin** to sign in", cancellationToken);
        return;
    }
    var me = await context.GetUserGraphClient().Me.GetAsync();
    await context.Send($"user \"{me!.DisplayName}\" signed in.", cancellationToken);
});

teams.OnMessage(async (context, cancellationToken) =>
{
    if (context.IsSignedIn)
    {
        await context.Send($"You said : {context.Activity.Text}.  Please type **/whoami** to see your profile or **/signout** to sign out.", cancellationToken);
    }
    else
    {
        await context.Send($"You said : {context.Activity.Text}.  Please type **/signin** to sign in.", cancellationToken);
    }
});
```

<!-- signing-out -->

```cs
teams.OnMessage("/signout", async (context, cancellationToken) =>
{
    if (!context.IsSignedIn)
    {
        await context.Send("you are not signed in!", cancellationToken);
        return;
    }

    await context.SignOut(cancellationToken);
    await context.Send("you have been signed out!", cancellationToken);
});
```
<!-- pending-messages -->

:::note
The C# OAuth APIs shown below (`OAuthFlow`, `SignInAsync`, `OnSignInComplete`) are available in the [`Microsoft.Teams.Apps`](https://www.nuget.org/packages/Microsoft.Teams.Apps) core package (2.1+ preview).
:::

```cs
using System.Collections.Concurrent;

var pendingMessages = new ConcurrentDictionary<string, (string Text, object Activity)>();

// Get the pre-registered OAuth flow
OAuthFlow auth = teams.GetOAuthFlow("graph");

teams.OnMessage(async (context, cancellationToken) =>
{
    // SignInAsync returns null if SSO was initiated (result arrives via OnSignInComplete)
    string? token = await auth.SignInAsync(context, cancellationToken);

    if (token is null)
    {
        // Sign-in initiated — store the original message
        var userId = context.Activity.From?.Id ?? string.Empty;
        pendingMessages[userId] = (context.Activity.Text ?? string.Empty, context.Activity);
        return;
    }

    // User is already signed in — process normally
    await ProcessMessage(context.Activity.Text, context, cancellationToken);
});

auth.OnSignInComplete(async (context, tokenResponse, cancellationToken) =>
{
    var userId = context.Activity.From?.Id ?? string.Empty;

    if (pendingMessages.TryRemove(userId, out var pending))
    {
        await context.SendActivityAsync("Successfully signed in! Processing your original request...", cancellationToken);
        await ProcessMessage(pending.Text, context, cancellationToken);
    }
    else
    {
        await context.SendActivityAsync("You are now signed in!", cancellationToken);
    }
});
```

<!-- signin-failure -->

```cs
teams.OnSignInFailure(async (context, cancellationToken) =>
{
    var failure = context.Activity.Value;
    Console.WriteLine($"Sign-in failed: {failure?.Code} - {failure?.Message}");
    await context.Send("Sign-in failed.", cancellationToken);
});
```

<!-- regional-bot -->

N/A