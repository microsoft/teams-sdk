<!-- prerequisites -->

- **.NET** v.8 or higher. Install or upgrade from [dotnet.microsoft.com](https://dotnet.microsoft.com/en-us/download).

<!-- create-command -->

```sh
teams project new csharp quote-agent --template echo
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
[INFO] Microsoft.Hosting.Lifetime Application started. Press Ctrl+C to shut down.
[INFO] Microsoft.Hosting.Lifetime Hosting environment: Development
```

<!-- post-startup-explanation -->

The HTTP server is now listening on port `3978`. To test your agent locally without sideloading it into Teams, use the **[Microsoft 365 Agents Playground](/developer-tools/agents-playground)**.

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

N/A

<!-- manual-code -->

N/A

<!-- manual-more -->

N/A

<!-- local-test-link -->

- [Microsoft 365 Agents Playground](/developer-tools/agents-playground)
