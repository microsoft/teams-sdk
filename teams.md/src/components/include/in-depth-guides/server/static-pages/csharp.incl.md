<!-- method-name -->

SDK 2.0 `app.AddTab()` helper or SDK 2.1 ASP.NET route mapping with `app.MapGet(...)`

<!-- code-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
app.AddTab("myApp", "Web/bin");
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using Microsoft.AspNetCore.StaticFiles;

FileExtensionContentTypeProvider contentTypes = new();

app.MapGet("/tabs/myApp", () =>
{
    string index = Path.Combine(Directory.GetCurrentDirectory(), "Web", "bin", "index.html");
    contentTypes.TryGetContentType(index, out string? ct);
    return Results.File(File.OpenRead(index), ct ?? "text/html");
});

app.MapGet("/tabs/myApp/{*path}", (string? path) =>
{
    string root = Path.Combine(Directory.GetCurrentDirectory(), "Web", "bin");
    string full = Path.Combine(root, path ?? "index.html");
    contentTypes.TryGetContentType(full, out string? ct);
    return Results.File(File.OpenRead(full), ct ?? "text/html");
});
```

  </TabItem>
</Tabs>

<!-- route-pattern -->

`http://localhost:{PORT}/tabs/myApp` or `https://{BOT_DOMAIN}/tabs/myApp`

<!-- additional-resources -->

- For more details about Tab apps, see the [Tabs](../tabs/) in-depth guide.
- For an example of hosting a Dialog, see the [Creating Dialogs](../dialogs/creating-dialogs) in-depth guide.
