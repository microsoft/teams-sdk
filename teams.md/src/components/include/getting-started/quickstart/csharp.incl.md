<!-- prerequisites -->

- **.NET** v.8 or higher. Install or upgrade from [dotnet.microsoft.com](https://dotnet.microsoft.com/en-us/download).

<!-- create-command -->

```sh
npx @microsoft/teams.cli@latest new csharp quote-agent --template echo
```

<!-- create-explanation -->

1. Creates a new directory called `Quote.Agent`.
2. Bootstraps the echo agent template files into your project directory.
3. Creates your agent's manifest files, including a `manifest.json` file and placeholder icons in the `Quote.Agent/appPackage` directory. The Teams [app manifest](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema) is required for [sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) the app into Teams.

<!-- running-steps -->

1. Navigate to your new agent's directory:

```sh
cd Quote.Agent/Quote.Agent
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

4. In the console, you should see a similar output:

```sh
[INFO] Microsoft.Hosting.Lifetime Now listening on: http://localhost:3978
[WARN] Echo.Microsoft.Teams.Plugins.AspNetCore.DevTools ⚠️  Devtools are not secure and should not be used production environments ⚠️
[INFO] Echo.Microsoft.Teams.Plugins.AspNetCore.DevTools Available at http://localhost:3979/devtools
[INFO] Microsoft.Hosting.Lifetime Application started. Press Ctrl+C to shut down.
[INFO] Microsoft.Hosting.Lifetime Hosting environment: Development
```
