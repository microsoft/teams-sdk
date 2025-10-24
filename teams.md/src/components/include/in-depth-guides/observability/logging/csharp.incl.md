<!-- default-logger -->

`ConsoleLogger`

<!-- package-name -->

`Microsoft.Teams.Common`

<!-- custom-logger-example -->

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Common.Logging;
using Microsoft.Teams.Plugins.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

var appBuilder = App.Builder()
    .AddLogger(new ConsoleLogger())

builder.AddTeams(appBuilder)

var app = builder.Build();
var teams = app.UseTeams();
```
