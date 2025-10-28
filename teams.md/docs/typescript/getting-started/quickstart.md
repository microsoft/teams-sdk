---
sidebar_position: 0
summary: Step-by-step guide to quickly get started with Teams SDK using the Teams CLI to create your first agent. Start here to build your first agent or application. We STRONGLY recommend using this as a guide to get started. It will help you build your project structure and scaffold your project.
---

# Quickstart

Get started with Teams SDK quickly using the Teams CLI.

## Set up a new project

### Prerequisites

- **Node.js** v.20 or higher. Install or upgrade from [nodejs.org](https://nodejs.org/).

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
npx @microsoft/teams.cli@latest new typescript quote-agent --template echo
```


This command:

1. Creates a new directory called `quote-agent`.
2. Bootstraps the echo agent template files into it under `quote-agent/src`.
3. Creates your agent's manifest files, including a `manifest.json` file and placeholder icons in the `quote-agent/appPackage` directory. The Teams [app manifest](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema) is required for [sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) the app into Teams.

> The `echo` template creates a basic agent that repeats back any message it receives - perfect for learning the fundamentals.

## Running your agent

1. Navigate to your new agent's directory:


```sh
cd quote-agent
```


2. Install the dependencies:


```sh
npm install
```


3. Start the development server:


```sh
npm run dev
```


4. In the console, you should see a similar output:


```sh
> quote-agent@0.0.0 dev
> npx nodemon -w "./src/**" -e ts --exec "node -r ts-node/register -r dotenv/config ./src/index.ts"

[nodemon] 3.1.9
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): src/**
[nodemon] watching extensions: ts
[nodemon] starting `node -r ts-node/register -r dotenv/config ./src/index.ts`
[WARN] @teams/app/devtools ⚠️  Devtools are not secure and should not be used production environments ⚠️
[INFO] @teams/app/http listening on port 3978 🚀
[INFO] @teams/app/devtools available at http://localhost:3979/devtools
```


When the application starts, you'll see:

1. An HTTP server starting up (on port 3978). This is the main server which handles incoming requests and serves the agent application.
2. A devtools server starting up (on port 3979). This is a developer server that provides a web interface for debugging and testing your agent quickly, without having to deploy it to Teams.

:::info
The DevTools server runs on a separate port to avoid conflicts with your main application server. This allows you to test your agent locally while keeping the main server available for Teams integration.
:::

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
