<!-- prerequisites -->

- **.NET** v8 or higher. Install or upgrade from [dotnet.microsoft.com](https://dotnet.microsoft.com/en-us/download).

<!-- create-command -->

```sh
teams project new csharp quote-agent --template echo
```

<!-- create-explanation -->

1. Creates a new directory called `QuoteAgent`.
2. Bootstraps the echo agent template files into your project directory.

<!-- running-steps -->

1. Navigate to your new agent's directory:

```sh
cd QuoteAgent/QuoteAgent
```

2. Install the dependencies:

```sh
dotnet restore
```

3. Start the development server:

```sh
dotnet run
```

<!-- console-output -->

1. In the console, you should see a similar output:


```sh
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:3978
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
```

<!-- post-startup-explanation -->

The HTTP server is now listening on port `3978`. To test your agent locally without sideloading it into Teams, use the **[Microsoft 365 Agents Playground](/developer-tools/agents-playground)**.

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

The playground sends unauthenticated requests, which a default `builder.AddTeams()` rejects when no credentials are configured. For local testing, enable `skipAuth` so your agent accepts them:

```csharp title="Program.cs"
builder.AddTeams(skipAuth: true);
```

:::warning
Only use `skipAuth` for local development — never in production, as it disables inbound request authentication.
:::

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

The playground sends unauthenticated requests, and SDK 2.1 rejects them by default. For local testing, enable `DangerouslyAllowUnauthenticatedRequests` in your launch settings:

```json title="Properties/launchSettings.json"
{
  "profiles": {
    "https": {
      "environmentVariables": {
        "AzureAd__DangerouslyAllowUnauthenticatedRequests": "true"
      }
    }
  }
}
```

:::warning
Only use `DangerouslyAllowUnauthenticatedRequests` for local development — never in production, as it disables inbound request authentication.
:::

  </TabItem>
</Tabs>

Install the playground globally:

```sh
npm install -g @microsoft/m365agentsplayground
```

Then, with your agent still running, open a second terminal and launch the playground pointed at your agent:

```sh
agentsplayground -e http://localhost:3978/api/messages -c emulator
```

The playground opens at [http://localhost:56150](http://localhost:56150). Send a message in the compose box and your agent's reply renders inline.

![Microsoft 365 Agents Playground showing a user message 'hello!' and an agent reply 'you said "hello!"'.](/screenshots/agents-playground-echo-chat.png)

<!-- manual-install -->

```sh
dotnet add package Microsoft.Teams.Apps --prerelease
```

<!-- manual-code -->

```csharp
using Microsoft.Teams.Apps;

var builder = WebApplication.CreateBuilder(args);

// Register the Teams services on your existing app
builder.Services.AddTeamsBotApplication();

var app = builder.Build();

// Maps POST /api/messages onto your existing ASP.NET Core app
TeamsBotApplication teams = app.UseTeamsBotApplication();

teams.OnMessage(async (context, cancellationToken) =>
{
    await context.SendAsync($"you said: {context.Activity.Text}", cancellationToken);
});

app.Run();
```

<!-- manual-more -->

N/A

<!-- local-test-link -->

- [Microsoft 365 Agents Playground](/developer-tools/agents-playground)
