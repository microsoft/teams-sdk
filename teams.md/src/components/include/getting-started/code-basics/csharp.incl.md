<!-- imports -->

N/A

<!-- project-structure -->

```
QuoteAgent/
├── Program.cs        # Main application startup code
```

<!-- project-structure-description -->

- **Program.cs**: Contains the main application code and is the entry point for your application.

<!-- app-class-code -->

```csharp title="Program.cs"
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Handlers;

WebApplicationBuilder builder = WebApplication.CreateSlimBuilder(args);
builder.Services.AddTeamsBotApplication();
WebApplication app = builder.Build();

TeamsBotApplication teams = app.UseTeamsBotApplication();

teams.OnMessage(async (context, cancellationToken) =>
{
    await context.TypingAsync(cancellationToken: cancellationToken);
    await context.SendAsync($"you said '{context.Activity.Text}'", cancellationToken);
});

app.Run();
```

<!-- plugin-events -->

(onActivity, onActivitySent, etc.)

<!-- local-test-note -->

To test your agent locally without sideloading into Teams, run the **[Microsoft 365 Agents Playground](/developer-tools/agents-playground)** alongside your agent. The playground is a separate CLI tool and does not require a plugin in your app code.

<!-- message-handling-code -->

```csharp title="Program.cs"
teams.OnMessage(async (context, cancellationToken) =>
{
    await context.TypingAsync(cancellationToken: cancellationToken);
    await context.SendAsync($"you said \"{context.Activity.Text}\"", cancellationToken);
});
```


<!-- message-handling-step1 -->

Listens for all incoming messages using `onMessage` handler.

<!-- message-handling-step3 -->

Responds by echoing back the received message.

<!-- message-handling-info -->

:::info
Each activity type has both an attribute and a functional method for type safety/simplicity
of routing logic!
:::

<!-- app-lifecycle-code -->

```csharp
WebApplication app = builder.Build();
app.UseTeamsBotApplication();
app.Run();
```
