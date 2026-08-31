<!-- migration-note -->

N/A

<!-- package-overview -->

N/A

<!-- app-graph-example -->

```csharp
using Azure.Identity;
using Microsoft.Graph;

var credential = new ClientSecretCredential(
    configuration["AzureAd:TenantId"],
    configuration["AzureAd:ClientId"],
    configuration["AzureAd:ClientCredentials:0:ClientSecret"]);

var graph = new GraphServiceClient(credential, ["https://graph.microsoft.com/.default"]);
var user = await graph.Me.GetAsync(cancellationToken: cancellationToken);
Console.WriteLine($"User ID: {user?.Id}");
Console.WriteLine($"User Display Name: {user?.DisplayName}");
Console.WriteLine($"User Email: {user?.Mail}");
Console.WriteLine($"User Job Title: {user?.JobTitle}");
```

<!-- user-graph-intro -->

To access Graph with the signed-in user's token, do this in a message handler:

<!-- user-graph-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

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

Here, the "context.UserGraph" object is a scoped graph client for the user that sent the message.

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Net.Http.Headers;

var flow = teams.GetOAuthFlow("graph");
teams.OnMessage(async (context, cancellationToken) =>
{
    var token = await flow.SignInAsync(context, cancellationToken);
    if (token is null) return;

    using var http = new HttpClient();
    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    var meJson = await http.GetStringAsync(
        "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,jobTitle",
        cancellationToken);

    await context.SendAsync(meJson, cancellationToken);
});
```

</TabItem>
</Tabs>


<!-- advanced-sections -->

N/A

<!-- additional-resources -->

N/A
