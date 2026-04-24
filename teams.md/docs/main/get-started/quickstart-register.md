---
sidebar_position: 1
title: "Quickstart: Register your app"
summary: Register a Teams app and bot using the Teams CLI, then sideload into Teams.
---

# Quickstart: Register your app

Register a Teams app and its bot infrastructure with the [Teams CLI](/cli/) (`@microsoft/teams.cli`). At the end you'll have a running agent installed in Teams.

If you don't have an agent yet, step 3 scaffolds one using the Teams SDK. If you already have a server, skip step 3 and pass your endpoint to step 4.

:::tip Let your AI assistant do this for you
Install the [`teams-dev` skill](/cli/getting-started/agent-skills) in Claude Code, GitHub Copilot, Cursor, or VS Code, then say *"create a Teams bot"* — your assistant runs every step on this page for you, including the tunnel setup and sideload link.
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

```bash
teams project new typescript echo-bot
cd echo-bot
```

Replace `typescript` with `csharp` or `python` for those languages. The default template is `echo` — see `teams project new typescript --help` for other templates (`ai`, `graph`, `mcp`, `mcpclient`, `tab`).

## 4. Register bot infrastructure

Run from inside your project directory:

```bash
teams app create \
  --name echo-bot \
  --endpoint https://<tunnel-host>/api/messages \
  --env .env \
  --teams-managed
```

This creates the Entra app, a Teams-managed bot registration, the Teams app entry, and writes `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` into `.env`.

For C#, pass `--env appsettings.json` to write credentials under a `Teams` section with PascalCase keys.

### Teams-managed vs. Azure

| | `--teams-managed` | `--azure` |
|---|---|---|
| Azure subscription | Not required | Required |
| OAuth / SSO | Not supported | Supported |
| Best for | Local dev, prototyping | Production |

To migrate later: `teams app bot migrate <appId> --resource-group <rg>`. See [Bot Locations](/cli/concepts/bot-locations) for details.

## 5. Run your agent

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

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

Verify the bot is listening:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3978/api/messages
```

`401` means the agent is running and rejecting unsigned requests — exactly what you want.

## 6. Install in Teams

```bash
teams app get --install-link
```

Open the printed URL in a browser signed in to Teams, click **Add**, and send your bot a message.

## What's next

- [Quickstart: Build your first bot](./quickstart-build) — wire up handlers and reply logic
- [Agent Skills](/cli/getting-started/agent-skills) — let your AI coding assistant run this whole flow for you
- [CLI command reference](/cli/commands/) — every flag, every subcommand
