<!-- package-info -->

`Microsoft.Graph` package

<!-- migration-note -->

N/A

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

<Tabs>
  <TabItem label="Controller" value="controller" default>
    ```csharp
    [Message]
    public async Task OnMessage([Context] MessageActivity activity, [Context] GraphClient userGraph)
    {
        var user = await userGraph.Me.GetAsync();
        Console.WriteLine($"User ID: {user.id}");
        Console.WriteLine($"User Display Name: {user.displayName}");
        Console.WriteLine($"User Email: {user.mail}");
        Console.WriteLine($"User Job Title: {user.jobTitle}");
    }
    ```
  </TabItem>
  <TabItem label="Minimal" value="minimal">
    ```csharp
    app.OnMessage(async context =>
    {
        var user = await context.UserGraph.Me.GetAsync();
        Console.WriteLine($"User ID: {user.id}");
        Console.WriteLine($"User Display Name: {user.displayName}");
        Console.WriteLine($"User Email: {user.mail}");
        Console.WriteLine($"User Job Title: {user.jobTitle}");
    });
    ```
  </TabItem>
</Tabs>

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
