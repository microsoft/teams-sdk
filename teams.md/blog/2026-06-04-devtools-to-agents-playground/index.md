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

DevTools is being retired across all three Teams SDK languages in favor of Microsoft 365 Agents Playground. It is now obsolete in TypeScript and .NET, and the package has already been removed in Python. If you use DevTools today, here is what to install, what to remove from your bot, and how the local dev loop changes.

<!-- truncate -->

## What changes

- **TypeScript and .NET:** `DevtoolsPlugin` and `AddTeamsDevTools()` are now marked obsolete. They keep working through the grace period and emit a deprecation warning at build time. Removal will happen in a later release, so you can migrate at your own pace.
- **Python:** The `microsoft-teams-devtools` package was deprecated and has already been removed. If you depend on it, move to Playground now.

## What is Microsoft 365 Agents Playground

Playground is a standalone CLI tool, installed alongside your bot rather than bundled into your project. It opens a chat UI at `http://localhost:56150`, lets you send messages to your bot, mock arbitrary activity types (membership changes, invokes, message reactions), and inspect every HTTP exchange in a log panel.

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
agentsplayground -e http://localhost:3978/api/messages -c emulator
```

The UI opens at `http://localhost:56150`. Type a message, your bot replies inline, and the log panel shows the full HTTP round trip.

## Running without credentials

DevTools bypassed authentication implicitly because it ran in-process. Playground sends real HTTP requests, so your bot needs to accept them.

The easiest path is to leave your AAD credentials unset. Comment out `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` in `.env` (TypeScript and Python), or omit the equivalents from `appsettings.json` (.NET). The SDK detects there are no credentials and accepts unauthenticated requests, with a startup warning so the mode is explicit:

```
[WARN] No credentials configured (CLIENT_ID / CLIENT_SECRET / TENANT_ID).
       Bot will accept unauthenticated requests on /api/messages.
```

If you want to keep credentials configured (for example, to match a production environment), set the `skipAuth` option instead. In TypeScript that is `new App({ skipAuth: true })`; in Python, `App(skip_auth=True)`; in .NET, `builder.AddTeams(skipAuth: true)`. This option assumes your credentials are real and valid.

## What stays the same

Your bot code, message handlers, manifests, and deployment story all work unchanged. Only the local debugging glue moves: a plugin or project reference goes away, and a standalone CLI tool takes its place.

## Questions and feedback

File issues against the relevant SDK repo:

- [microsoft/teams.ts](https://github.com/microsoft/teams.ts)
- [microsoft/teams.py](https://github.com/microsoft/teams.py)
- [microsoft/teams.net](https://github.com/microsoft/teams.net)
