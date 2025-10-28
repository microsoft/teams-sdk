---
sidebar_position: 1
summary: Quick start guide for C# Teams SDK using the Teams CLI to create and run your first .NET agent.
---

# Quickstart

Get started with Teams SDK quickly using the Teams CLI.

## Set up a new project

### Prerequisites

- **.NET** v.8 or higher. Install or upgrade from [dotnet.microsoft.com](https://dotnet.microsoft.com/en-us/download).

## Instructions

### Use the Teams CLI

Use your terminal to run the Teams CLI using npx:


```sh
npx @microsoft/teams.cli --version
```


:::info
_The [Teams CLI](/developer-tools/cli) is a command-line tool that helps you create and manage Teams applications. It provides a set of commands to simplify the development process._<br /><br />
Using `npx` allows you to run the Teams CLI without installing it globally. You can verify it works by running the version command above.
:::

## Creating Your First Agent

Let's begin by creating a simple echo agent that responds to messages. Run:


```sh
npx @microsoft/teams.cli@latest new csharp quote-agent --template echo
```


This command:

1. Creates a new directory called `Quote.Agent`.
2. Bootstraps the echo agent template files into your project directory.
3. Creates your agent's manifest files, including a `manifest.json` file and placeholder icons in the `Quote.Agent/appPackage` directory. The Teams [app manifest](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema) is required for [sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) the app into Teams.

> The `echo` template creates a basic agent that repeats back any message it receives - perfect for learning the fundamentals.

## Running your agent

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


4. In the console, you should see a similar output:


```sh
[INFO] Microsoft.Hosting.Lifetime Now listening on: http://localhost:3978
[WARN] Echo.Microsoft.Teams.Plugins.AspNetCore.DevTools ⚠️  Devtools are not secure and should not be used production environments ⚠️
[INFO] Echo.Microsoft.Teams.Plugins.AspNetCore.DevTools Available at http://localhost:3979/devtools
[INFO] Microsoft.Hosting.Lifetime Application started. Press Ctrl+C to shut down.
[INFO] Microsoft.Hosting.Lifetime Hosting environment: Development
```


When the application starts, you'll see:

1. An HTTP server starting up (on port 3978). This is the main server which handles incoming requests and serves the agent application.
2. A devtools server starting up. This is a developer server that provides a web interface for debugging and testing your agent quickly, without having to deploy it to Teams.

Now, navigate to the devtools server by opening your browser and navigating to [http://localhost:3979/devtools](http://localhost:3979/devtools). You should see a simple interface where you can interact with your agent. Try sending it a message!

![Screenshot of DevTools showing user prompt 'hello!' and agent response 'you said hello!'.](/screenshots/devtools-echo-chat.png)

## Next steps

After creating and running your first agent, read about [the code basics](code-basics) to better understand its components and structure.

Otherwise, if you want to run your agent in Teams, you can check out the [Running in Teams](running-in-teams) guide.

## Resources

- [Teams CLI documentation](/developer-tools/cli)
- [Teams DevTools documentation](/developer-tools/devtools)
- [Teams manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Teams sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload)
