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
teams.OnMessage("/signin", async context =>
{
    if (context.IsSignedIn)
    {
        await context.Send("you are already signed in!");
        return;
    }
    else
    {
        await context.SignIn();
    }
});
```

<!-- signin-event -->

```cs
teams.OnSignIn(async (_, teamsEvent) =>
{
    var context = teamsEvent.Context;
    await context.Send($"Signed in using OAuth connection {context.ConnectionName}. Please type **/whoami** to see your profile or **/signout** to sign out.");
});
```

<!-- using-graph -->

```cs
teams.OnMessage("/whoami", async context =>
{
    if (!context.IsSignedIn)
    {
        await context.Send("you are not signed in!. Please type **/signin** to sign in");
        return;
    }
    var me = await context.GetUserGraphClient().Me.GetAsync();
    await context.Send($"user \"{me!.DisplayName}\" signed in.");
});

teams.OnMessage(async context =>
{
    if (context.IsSignedIn)
    {
        await context.Send($"You said : {context.Activity.Text}.  Please type **/whoami** to see your profile or **/signout** to sign out.");
    }
    else
    {
        await context.Send($"You said : {context.Activity.Text}.  Please type **/signin** to sign in.");
    }
});
```

<!-- signing-out -->

```cs
teams.OnMessage("/signout", async context =>
{
    if (!context.IsSignedIn)
    {
        await context.Send("you are not signed in!");
        return;
    }

    await context.SignOut();
    await context.Send("you have been signed out!");
});
```
