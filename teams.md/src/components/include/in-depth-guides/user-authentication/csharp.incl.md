<!-- create-project -->

Use your terminal to run the following command:

```sh
npx @microsoft/teams.cli@latest new csharp oauth-app --template graph
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