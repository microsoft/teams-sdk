<!-- create-project -->

N/A

<!-- configure-oauth -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Plugins.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

var appBuilder = App.Builder()
    .AddOAuth("graph"); // default connection

builder.AddTeams(appBuilder);
var app = builder.Build();
var teams = app.UseTeams();
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

:::info
In SDK 2.1, you can register and use multiple OAuth connections in one bot (for example, Graph + GitHub) by adding multiple `AddOAuthFlow(...)` entries.
:::

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.OAuth;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddTeamsBotApplication(options =>
{
    options.AddOAuthFlow("graph", oauth =>
    {
        oauth.OAuthCardText = "Sign in to Microsoft Graph";
        oauth.SignInButtonText = "Sign in to Graph";
    });
    options.AddOAuthFlow("github", oauth =>
    {
        oauth.OAuthCardText = "Sign in to GitHub";
        oauth.SignInButtonText = "Sign in to GitHub";
    });
});

var app = builder.Build();
var teams = app.UseTeamsBotApplication();

OAuthFlow graphAuth = teams.GetOAuthFlow("graph");
OAuthFlow githubAuth = teams.GetOAuthFlow("github");
```

  </TabItem>
</Tabs>

<!-- signing-in -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

  :::note
This uses the Single Sign-On (SSO) authentication flow. To learn more about all the available flows and their differences see the [official documentation](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-authentication?view=azure-bot-service-4.0).
:::

```csharp
teams.OnMessage("/signin", async (context, cancellationToken) =>
{
    if (context.IsSignedIn)
    {
        await context.Send("you are already signed in!", cancellationToken);
        return;
    }

    await context.SignIn(new OAuthOptions
    {
        ConnectionName = "graph",
        OAuthCardText = "Sign in to your account",
        SignInButtonText = "Sign in"
    }, cancellationToken);
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>
Call `SignInAsync` on the flow directly — each flow manages its own sign-in state independently.
  :::note
The graph connection uses the Single Sign-On (SSO) authentication flow whereas the Github connection uses the oauth flow. To learn more about all the available flows and their differences see the [official documentation](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-authentication?view=azure-bot-service-4.0).
:::

```csharp
teams.OnMessage("/signin graph", async (context, cancellationToken) =>
{
    string? token = await graphAuth.SignInAsync(context, cancellationToken);
    if (token is not null)
    {
        await context.SendAsync("you are already signed in to Graph!", cancellationToken);
    }
});

teams.OnMessage("/signin github", async (context, cancellationToken) =>
{
    string? token = await githubAuth.SignInAsync(context, cancellationToken);
    if (token is not null)
    {
        await context.SendAsync("you are already signed in to GitHub!", cancellationToken);
    }
});
```

  </TabItem>
</Tabs>

<!-- signin-event -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
teams.OnSignIn(async (_, teamsEvent, cancellationToken) =>
{
    var context = teamsEvent.Context;
    await context.Send(
        $"Signed in using OAuth connection {context.ConnectionName}. Please type **/whoami** to see your profile or **/signout** to sign out.",
        cancellationToken);
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>
Success and failure callbacks are scoped per flow — no branching on connection name needed.
```csharp
graphAuth.OnSignInComplete(async (context, tokenResponse, cancellationToken) =>
{
    await context.SendAsync(
        $"Signed in to Graph ({tokenResponse.ConnectionName}). Type **/whoami** to continue.",
        cancellationToken);
});

githubAuth.OnSignInComplete(async (context, tokenResponse, cancellationToken) =>
{
    await context.SendAsync(
        $"Signed in to GitHub ({tokenResponse.ConnectionName}).",
        cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- using-graph -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
teams.OnMessage("/whoami", async (context, cancellationToken) =>
{
    if (!context.IsSignedIn)
    {
        await context.Send("you are not signed in. Please type **/signin** to sign in.", cancellationToken);
        return;
    }

    var me = await context.GetUserGraphClient().Me.GetAsync(cancellationToken: cancellationToken);
    await context.Send($"user \"{me!.DisplayName}\" signed in.", cancellationToken);
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Net.Http.Headers;

teams.OnMessage("/whoami", async (context, cancellationToken) =>
{
    string? token = await graphAuth.SignInAsync(context, cancellationToken);
    if (token is null) return; // OAuth card sent / waiting for callback turn

    using var http = new HttpClient();
    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    string meJson = await http.GetStringAsync(
        "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName",
        cancellationToken);

    await context.SendAsync(meJson, cancellationToken);
});

teams.OnMessage("(?i)^my gh user$", async (context, cancellationToken) =>
{
    string? token = await githubAuth.SignInAsync(context, cancellationToken);
    if (token is null) return;

    using HttpClient http = new();
    http.DefaultRequestHeaders.Authorization = new("Bearer", token);
    http.DefaultRequestHeaders.UserAgent.ParseAdd("TeamsBot/1.0");

    string response = await http.GetStringAsync(
        "https://api.github.com/user", ct);
    await context.SendAsync($"Your GitHub user :\n```json\n{response}\n```", ct);
});

```

  </TabItem>
</Tabs>

<!-- signing-out -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
teams.OnMessage("/signout", async (context, cancellationToken) =>
{
    if (!context.IsSignedIn)
    {
        await context.Send("you are not signed in!", cancellationToken);
        return;
    }

    await context.SignOut(cancellationToken: cancellationToken);
    await context.Send("you have been signed out!", cancellationToken);
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMessage("/signout graph", async (context, cancellationToken) =>
{
    await graphAuth.SignOutAsync(context, cancellationToken);
    await context.SendAsync("you have been signed out from Graph!", cancellationToken);
});

teams.OnMessage("/signout github", async (context, cancellationToken) =>
{
    await githubAuth.SignOutAsync(context, cancellationToken);
    await context.SendAsync("you have been signed out from GitHub!", cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- pending-messages -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using System.Collections.Concurrent;

var pendingMessages = new ConcurrentDictionary<string, string>();

teams.OnMessage(async (context, cancellationToken) =>
{
    if (!context.IsSignedIn)
    {
        var userId = context.Activity.From?.Id ?? string.Empty;
        pendingMessages[userId] = context.Activity.Text ?? string.Empty;

        await context.SignIn(cancellationToken: cancellationToken);
        return;
    }

    await ProcessMessage(context.Activity.Text, context, cancellationToken);
});

teams.OnSignIn(async (_, teamsEvent, cancellationToken) =>
{
    var context = teamsEvent.Context;
    var userId = context.Activity.From?.Id ?? string.Empty;

    if (pendingMessages.TryRemove(userId, out var text))
    {
        await context.Send("Successfully signed in! Processing your original request...", cancellationToken);
        await ProcessMessage(text, context, cancellationToken);
    }
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Collections.Concurrent;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.OAuth;

var pendingMessages = new ConcurrentDictionary<string, string>();

teams.OnMessage("(?i)^my ad user$", async (context, cancellationToken) =>
{
    var userId = context.Activity.From?.Id ?? string.Empty;
    string? token = await graphAuth.SignInAsync(context, cancellationToken);
    if (token is null)
    {
        pendingMessages[userId] = context.Activity.Text ?? string.Empty;
        return;
    }

    await ProcessGraphMessage(context.Activity.Text, context, token, cancellationToken);
});

graphAuth.OnSignInComplete(async (context, tokenResponse, cancellationToken) =>
{
    var userId = context.Activity.From?.Id ?? string.Empty;
    if (pendingMessages.TryRemove(userId, out var text))
    {
        await context.SendAsync("Successfully signed in to Graph! Processing your request...", cancellationToken);
        await ProcessGraphMessage(text, context, tokenResponse.Token, cancellationToken);
    }
});
```

  </TabItem>
</Tabs>

<!-- signin-failure -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
teams.OnSignInFailure(async (context, cancellationToken) =>
{
    var failure = context.Activity.Value;
    context.Log.Error($"sign-in failed: {failure?.Code} - {failure?.Message}");
    await context.Send("Sign-in failed.", cancellationToken);
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
graphAuth.OnSignInFailure(async (context, failure, cancellationToken) =>
{
    await context.SendAsync(
        $"Graph sign-in failed: {failure?.Code} - {failure?.Message}",
        cancellationToken);
});

githubAuth.OnSignInFailure(async (context, failure, cancellationToken) =>
{
    await context.SendAsync(
        $"GitHub sign-in failed: {failure?.Code} - {failure?.Message}",
        cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- regional-bot -->

N/A
