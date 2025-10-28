---
sidebar_position: 2
summary: Guide to implementing custom logging in C# Teams SDK applications using the ConsoleLogger and custom logger options.
---

# 🗃️ Custom Logger

The `App` will provide a default logger, but you can also provide your own.
The default `Logger` instance will be set to `ConsoleLogger` from the
`Microsoft.Teams.Common` package.


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

