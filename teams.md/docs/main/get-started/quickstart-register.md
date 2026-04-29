---
sidebar_position: 1
title: "Quickstart: Register your app"
summary: Register a Teams app and bot using the Teams CLI, then sideload into Teams.
---

# Quickstart: Register your app

Register a Teams app and its bot infrastructure with the [Teams CLI](/cli/) (`@microsoft/teams.cli`). At the end you'll have a running agent installed in Teams.

If you don't have an agent yet, step 3 scaffolds one using the Teams SDK. If you already have a server, skip step 3 and pass your endpoint to step 4.

:::tip Let your AI assistant do this for you
Install the [`teams-dev` skill](/developer-tools/agent-skills) in Claude Code, GitHub Copilot, Cursor, or VS Code, then say *"create a Teams bot"* — your assistant runs every step on this page for you, including the tunnel setup and sideload link.
:::

## Prerequisites

- Node.js 20 or later
- An M365 account with **custom app upload (sideloading) enabled** on the tenant. Step 2 will check this.
- A public HTTPS tunnel pointing at your local server (e.g. [DevTunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/overview), [ngrok](https://ngrok.com/)). Start it before step 4.

## 1. Install the CLI

```bash
npm install -g @microsoft/teams.cli@preview
teams --version
```

## 2. Log in

```bash
teams login
teams status
```

`teams status` should show `Sideloading: enabled`. If it shows `disabled`, your tenant admin needs to enable [custom app upload](https://learn.microsoft.com/en-us/microsoftteams/teams-custom-app-policies-and-settings) before you can install your bot.

## 3. Scaffold a project

Skip this step if you're bringing your own server endpoint.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="language">
<TabItem value="typescript" label="TypeScript" default>

```bash
teams project new typescript echo-bot
cd echo-bot
```

</TabItem>
<TabItem value="csharp" label="C#">

```bash
teams project new csharp echo-bot
cd Echo.Bot/Echo.Bot
```

The C# scaffold creates a solution at `Echo.Bot/` with the project nested inside. Follow the **Next steps** line printed by the CLI for the exact path.

</TabItem>
<TabItem value="python" label="Python">

```bash
teams project new python echo-bot
cd echo-bot
```

</TabItem>
</Tabs>

The default template is `echo`. Run `teams project new <language> --help` to see other templates available for your language.

## 4. Register bot infrastructure

:::note Start your tunnel first
Teams must reach your bot over **public HTTPS** — your `localhost` port isn't reachable from Teams' servers. Before running the command below, start a tunnel (e.g. [DevTunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/overview) or [ngrok](https://ngrok.com/)) and replace `<tunnel-host>` with the hostname it gives you.

[Learn more about local tunnels →](/cli/concepts/local-tunnels)
:::

Run from inside your project directory:

<Tabs groupId="language">
<TabItem value="typescript" label="TypeScript" default>

```bash
teams app create \
  --name echo-bot \
  --endpoint https://<tunnel-host>/api/messages \
  --env .env
```

</TabItem>
<TabItem value="csharp" label="C#">

```bash
teams app create \
  --name echo-bot \
  --endpoint https://<tunnel-host>/api/messages \
  --env appsettings.json
```

Credentials are written under a `Teams` section with PascalCase keys (`ClientId`, `ClientSecret`, `TenantId`).

</TabItem>
<TabItem value="python" label="Python">

```bash
teams app create \
  --name echo-bot \
  --endpoint https://<tunnel-host>/api/messages \
  --env .env
```

</TabItem>
</Tabs>

The command prints a summary including the **Teams App ID** and an **Install in Teams** link, and writes credentials into your env file.

## 5. Run your agent

<Tabs groupId="language">
<TabItem value="typescript" label="TypeScript" default>

```bash
npm install
npm run dev
```

</TabItem>
<TabItem value="csharp" label="C#">

```bash
dotnet run
```

</TabItem>
<TabItem value="python" label="Python">

```bash
pip install -e .
python src/main.py
```

</TabItem>
</Tabs>

You should see `listening on port 3978 🚀` in the terminal. Your tunnel will now forward Teams traffic to your local server.

## 6. Install in Teams

The **Install in Teams** link from step 4 is your sideload URL. Click it from a browser signed in to Teams, then **Add**.

If you closed the terminal and need the link again:

```bash
teams app get <teamsAppId> --install-link
```

Use the `Teams App ID` printed in step 4. (Run `teams app list` to see all your apps with IDs.)

Send your bot a message to confirm it's working.

## What's next

- [Quickstart: Build your first bot](./quickstart-build) — wire up handlers and reply logic
- [Agent Skills](/developer-tools/agent-skills) — let your AI coding assistant run this whole flow for you
- [CLI command reference](/cli/commands/) — every flag, every subcommand
