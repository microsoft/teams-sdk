<!-- accessing-services -->

### Accessing DI Services in Handlers

The Teams SDK uses the minimal API callback pattern. Services registered in `builder.Services` are available via `app.Services` after `builder.Build()`. Capture them in your handler closures:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddTeams();

// Register your services
builder.Services.AddSingleton<IMyService, MyService>();

var app = builder.Build();
var teams = app.UseTeams();

// Resolve from DI and capture in the closure
var myService = app.Services.GetRequiredService<IMyService>();

teams.OnMessage(async (context, cancellationToken) =>
{
    // myService is captured from the outer scope
    var result = await myService.ProcessAsync(context.Activity.Text);
    await context.Send(result, cancellationToken);
});

app.Run();
```

This is the same pattern used throughout ASP.NET Core minimal APIs.

<!-- scoped-services -->

### Scoped Services (e.g., DbContext)

Scoped services are created once per scope. In a controller, ASP.NET Core creates a scope per request automatically. In callbacks, you create the scope yourself:

```csharp
var sp = app.Services;

teams.OnMessage(async (context, cancellationToken) =>
{
    using var scope = sp.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<MyDbContext>();
    // dbContext is scoped to this request
    await dbContext.Logs.AddAsync(new LogEntry { Text = context.Activity.Text });
    await dbContext.SaveChangesAsync(cancellationToken);
});
```

:::warning
Do not resolve scoped services directly from `app.Services` — this throws `InvalidOperationException` at runtime. Always use `CreateScope()`.
:::

<!-- coming-from-controllers -->

### Coming from Controllers?

If you previously used controller-based bots, you're used to constructor injection:

```csharp
public class MyBot : ActivityHandler
{
    private readonly IMyService _service;

    public MyBot(IMyService service)
    {
        _service = service;
    }
}
```

In the callback pattern, there's no class and no constructor. You resolve services from `app.Services` and capture them in closures. The result is the same — your handler has access to the service — the mechanism is different.

<!-- see-also -->

### See Also

- [Samples.Lights](https://github.com/microsoft/teams.net/blob/main/Samples/Samples.Lights/Program.cs#L18) — captures a prompt factory from DI
- [Middleware guide](/in-depth-guides/observability/middleware) — cross-cutting concerns via `app.Use()`
