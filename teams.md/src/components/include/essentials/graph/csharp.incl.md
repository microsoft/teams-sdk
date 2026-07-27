<!-- package-info -->

`Microsoft.Graph` package

<!-- migration-note -->

:::info[SDK 2.1 Preview]
The **Teams SDK for .NET 2.1** preview does **not** ship a built-in Graph client — the `Microsoft.Teams.Extensions.Graph` package (and the `app.Graph` / `userGraph` helpers described below) have no 2.1 equivalent. Instead, call Microsoft Graph directly with the [`Microsoft.Graph`](https://learn.microsoft.com/graph/sdks/sdks-overview) SDK (or `Azure.Identity` + `HttpClient`), reusing your bot's `AzureAd` configuration.

For an **app-only** call, acquire a token with the bot's own credentials:

```csharp
using Azure.Identity;
using Azure.Core;

// Reuse the bot's AzureAd:TenantId / ClientId / ClientCredentials[0]:ClientSecret
var credential = new ClientSecretCredential(
    configuration["AzureAd:TenantId"],
    configuration["AzureAd:ClientId"],
    configuration["AzureAd:ClientCredentials:0:ClientSecret"]);

var token = await credential.GetTokenAsync(
    new TokenRequestContext(["https://graph.microsoft.com/.default"]),
    cancellationToken);
// use token.Token as a Bearer token against https://graph.microsoft.com
```

For **delegated** (on-behalf-of-user) calls, obtain the user token through an [OAuth flow](../in-depth-guides/user-authentication) and pass it to the Graph SDK. The examples in the rest of this page describe the SDK 2.0 built-in client.
:::

<!-- package-overview -->

N/A

<!-- app-graph-object -->

`app.Graph`

<!-- app-access-method -->

N/A

<!-- app-graph-example -->

```csharp
// Equivalent of https://learn.microsoft.com/en-us/graph/api/user-get
// Gets the details of the bot-user
var user = app.Graph.Me.GetAsync().GetAwaiter().GetResult();
Console.WriteLine($"User ID: {user.id}");
Console.WriteLine($"User Display Name: {user.displayName}");
Console.WriteLine($"User Email: {user.mail}");
Console.WriteLine($"User Job Title: {user.jobTitle}");
```

<!-- user-graph-intro -->

To access the graph using the user's token, you need to do this as part of a message handler:

<!-- user-graph-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';


```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    var user = await context.UserGraph.Me.GetAsync();
    Console.WriteLine($"User ID: {user.id}");
    Console.WriteLine($"User Display Name: {user.displayName}");
    Console.WriteLine($"User Email: {user.mail}");
    Console.WriteLine($"User Job Title: {user.jobTitle}");
});
```


<!-- user-graph-object -->

`userGraph`

<!-- app-graph-in-handler -->

`appGraph`

<!-- app-graph-reference -->

`app.Graph`

<!-- advanced-sections -->

N/A

<!-- additional-resources -->

N/A
