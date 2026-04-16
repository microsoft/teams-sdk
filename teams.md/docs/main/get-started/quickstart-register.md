---
sidebar_position: 1
title: "Quickstart: Register your app"
summary: Register a Teams app, set up bot infrastructure, and sideload into Teams using the Teams CLI.
---

# Quickstart: Register your app

This quickstart walks you through registering a Teams app and its bot infrastructure using the **Teams CLI** (`@microsoft/teams.cli`). By the end you will have a running agent sideloaded into Teams.

**Primary use case (bring your own server endpoint):** if you already have a service running at a URL and want it in Teams, Steps 1–2 handle auth and Step 4 registers all infrastructure in a single command. Steps 3 and 5–7 cover scaffolding, running, and sideloading.

If you do not have an agent yet, Step 3 scaffolds one for you using the Teams SDK.

---

## Using this guide with a coding agent

This guide is written to be executed by a coding agent (Claude Code, Cursor, Copilot, etc.) with minimal human intervention.

:::tip Use the `teams-dev` skill
Instead of following these steps manually, install the Teams CLI skill and let your AI coding assistant run the entire workflow for you:

```bash
npx skills add microsoft/teams-sdk --skill teams-dev
```

Once installed, invoke it in Claude Code with `/teams-dev`, or ask your agent to "create a Teams bot" — it will handle the rest.
:::

- **`$BOT_NAME`** — the name of your agent project. Pick one, use it everywhere. Example: `echo-agent`
- **`$LANGUAGE`** — scaffold language: `typescript`, `csharp`, or `python`
- **`$TUNNEL_URL`** — your public HTTPS tunnel URL, without trailing slash. Example: `https://abc123.ngrok-free.app`
- **`$PORT`** — local port your agent will listen on. Default: `3978`
- Commands are complete and copy-pasteable. Replace `$VAR` placeholders before running.
- Each step ends with a **Verify** block. Run the verify command and confirm the expected output before proceeding.
- Steps marked **[human]** require a human action and cannot be automated.

---

## Prerequisites

```bash
node --version        # must be 18.x, 20.x, or 22.x
npm --version         # any recent version is fine
curl --version        # used for step verification
```

You also need:
- An M365 account with **custom app upload (sideloading) enabled** on the tenant. The `teams status` command in Step 2 will confirm this.
- A running HTTPS tunnel pointing to `http://localhost:$PORT`. Start this before Step 4.

**Verify your tunnel is alive before Step 4:**
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST $TUNNEL_URL/api/messages
# Expected: 401 (bot running) or 502/404 (tunnel live, bot not started)
# If you get "000" or a connection error, the tunnel is down — restart it
```

---

## Step 1 — Install the Teams CLI

```bash
npm install -g @microsoft/teams.cli
```

**Verify:**
```bash
teams --version
# Expected: a version string, e.g. "2.1.0-preview.1"
```

---

## Step 2 — Authenticate [human]

```bash
teams login
```

This opens a browser for sign-in. Once complete:

```bash
teams status
```

**Verify:**
```
Logged in as: <account>
Sideloading: enabled       ← must be "enabled"
```

If sideloading shows `disabled`, contact your tenant admin. Do not proceed until it shows `enabled`.

---

## Step 3 — Scaffold the project

Skip this step if you are bringing your own endpoint.

```bash
teams project new $LANGUAGE $BOT_NAME
cd $BOT_NAME
```

**Verify:**
```bash
ls $BOT_NAME
# Expected: project directory exists and has files
```

The scaffold produces a working agent using the Teams SDK with no code changes required. To add bot logic after registration, see [Quickstart: Build your first bot](./quickstart-build).

---

## Step 4 — Register bot infrastructure

Run from inside `$BOT_NAME/`. If bringing your own endpoint, run from any directory.

```bash
teams app create \
  --name $BOT_NAME \
  --endpoint $TUNNEL_URL/api/messages \
  --env .env \
  --teams-managed
```

This single command handles the full registration stack:

| What gets created | Where it lives |
|---|---|
| Entra app registration | Microsoft Entra admin center |
| Client secret | Written to `.env` as `CLIENT_SECRET` |
| Bot registration | Teams bot service |
| Teams app | Teams Developer Portal |

**Credentials written to `.env`:**
```
CLIENT_ID=<entra-app-id>
CLIENT_SECRET=<secret>
TENANT_ID=<tenant-id>
```

**Verify:**
```bash
grep -c "CLIENT_ID\|CLIENT_SECRET\|TENANT_ID" .env
# Expected: 3
```

### Teams-managed vs. Azure bot registration

| | `--teams-managed` | `--azure` |
|---|---|---|
| Azure subscription required | No | Yes |
| OAuth / SSO support | No | Yes |
| Best for | Local dev, prototyping | Production, enterprise |

To migrate from Teams-managed to Azure later:
```bash
teams app bot migrate <appId> --resource-group <rg>
```

---

## Step 5 — Configure port

The scaffold defaults to port `3978`. If your tunnel uses a different port:

```bash
echo "PORT=$PORT" >> .env
```

Skip if `$PORT` is `3978`.

---

## Step 6 — Install dependencies and run

```bash
npm install
npm run dev
```

**Verify:**
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:$PORT/api/messages
# Expected: 401
```

`401` means the agent is running and correctly rejecting unsigned requests.

---

## Step 7 — Sideload into Teams [human]

```bash
teams app list --json
# Find your app by name, note the teamsAppId
teams app get <teamsAppId> --install-link
```

Open the printed install link in a browser signed in to Teams, click **Add**, then send the agent a message.

---

## What's next

Your app is registered and running. Now add bot logic using the Teams SDK:

- [Quickstart: Build your first bot](./quickstart-build) — write message handlers and respond to Teams events
- [CLI Command Reference](/cli) — full reference for all `teams` commands
