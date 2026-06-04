---
slug: devtools-to-agents-playground
title: "Switching from DevTools to Microsoft 365 Agents Playground"
date: 2026-06-04
authors:
  - name: Corina Gum
    title: Microsoft
    url: https://github.com/corinagum
    image_url: https://github.com/corinagum.png
tags: [teams-sdk, devtools, agents-playground, local-development]
description: DevTools is being deprecated in favor of Microsoft 365 Agents Playground. Here is what to install, what to remove from your bot, and how your local dev loop changes.
---

DevTools, a local set of development tools for testing Teams apps without sideloading, is being retired across all three Teams SDK languages in favor of Microsoft 365 Agents Playground. The DevTools integrations in code have been marked as obsolete in TypeScript and .NET, and for Python the package has already been removed from PyPI. If you use DevTools today, here is what to install, what to remove from your bot, and how the local dev loop changes.

To make the development experience more streamlined, we've decided to adopt Agents Playground as our primary local development tool. This affords developers the robust feature set of Agents Playground while still streamlining being able to test your agent where it truly matters, in Teams.

<!-- truncate -->

## What changes

- **TypeScript and .NET:** `DevtoolsPlugin` and `AddTeamsDevTools()` are now marked obsolete. They keep working through the grace period and emit a deprecation warning at build time. Removal will happen in a later release, so you can migrate at your own pace.
- **Python:** The `microsoft-teams-devtools` package was deprecated and has already been removed. If you depend on it, move to Playground now.

## What is Microsoft 365 Agents Playground

Playground is a standalone web app you launch from the command line, installed alongside your bot rather than bundled into your project. It opens a chat UI at `http://localhost:56150`, lets you send messages to your bot, mock arbitrary activity types (membership changes, invokes, message reactions), and inspect every HTTP exchange in a log panel.

## Install

### Option 1: npm (recommended)

```bash
npm install -g @microsoft/m365agentsplayground
```

### Option 2: Standalone binary (Windows)

```bash
winget install agentsplayground
```

For other platforms and full install options, see the [Microsoft Learn guide](https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/test-with-toolkit-project).

## Migration steps

### TypeScript

Remove the plugin from your `App` constructor:

```diff
- import { DevtoolsPlugin } from '@microsoft/teams.dev';
  import { App } from '@microsoft/teams.apps';

- const app = new App({ plugins: [new DevtoolsPlugin()] });
+ const app = new App();
```

Then remove `@microsoft/teams.dev` from your `package.json`.

### .NET

Remove the call and the project reference:

```diff
- builder.AddTeams().AddTeamsDevTools();
+ builder.AddTeams();
```

Drop the `Microsoft.Teams.Plugins.AspNetCore.DevTools` `ProjectReference` from your `.csproj`.

### Python

Remove the plugin from your `App` and drop `microsoft-teams-devtools` from your dependencies:

```diff
- from microsoft_teams.devtools import DevToolsPlugin
  from microsoft_teams.apps import App

- app = App(plugins=[DevToolsPlugin()])
+ app = App()
```

If you never used the DevTools package, no code change is needed. Just install Playground.

## Run Playground against your bot

Start your bot locally on port `3978`, then in another shell:

```bash
agentsplayground -e http://localhost:3978/api/messages -c msteams
```

The `-c msteams` flag runs Playground in the Teams channel, so your agent receives the same `channelId` and lifecycle events (like installation updates) it would in production.

The UI opens at `http://localhost:56150`. Type a message, your bot replies inline, and the log panel shows the full HTTP round trip.

## Running without credentials

DevTools bypassed authentication implicitly because it ran in-process. Playground sends real HTTP requests, so your bot needs to accept them.

The easiest path is to leave your credentials unset. The SDK detects there are no credentials and accepts unauthenticated requests, with a startup warning so the mode is explicit:

```
[WARN] No credentials configured (CLIENT_ID / CLIENT_SECRET / TENANT_ID). Bot will accept unauthenticated requests on /api/messages.
```

## Want to test in Teams directly?

Playground is the fastest way to iterate locally, but you can also run your agent inside Teams itself. There are a few ways to get there.

Let your coding agent handle it with the [`teams-dev` agent skill](/developer-tools/agent-skills), which works with Copilot, Claude Code, and Cursor. Ask it to "get my agent running in Teams" and it drives the registration for you.

Or use the Teams Developer CLI directly. It registers your agent (identity, credentials, and manifest) in a single command, so you can test in the real Teams client instead of locally:

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams app create --name "My Agent" --endpoint https://<your-tunnel>/api/messages --env .env
```

The Teams Developer CLI is not required for this. You can register the app and create the bot resource directly with the [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) (`az`) or the Azure portal; the Teams CLI simply rolls those steps into one command.

See the [CLI docs](/cli/) to get your agent running in Teams.

## What stays the same

Your bot code, message handlers, manifests, and deployment story all work unchanged. Only the local debugging glue moves: a plugin or project reference goes away, and a standalone tool takes its place.

## Questions and feedback

File issues against the relevant SDK repo:

- [microsoft/teams.ts](https://github.com/microsoft/teams.ts)
- [microsoft/teams.py](https://github.com/microsoft/teams.py)
- [microsoft/teams.net](https://github.com/microsoft/teams.net)
