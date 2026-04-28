---
slug: teams-cli-preview
title: "Teams CLI Preview: build Teams apps from your terminal"
date: 2026-04-27
authors:
  - name: Aamir Jawaid
    title: Microsoft
    url: https://github.com/heyitsaamir
    image_url: https://github.com/heyitsaamir.png
  - name: Kavin Singh
    title: Microsoft
    url: https://github.com/singhk97
    image_url: https://github.com/singhk97.png
  - name: Umang Sehgal
    title: Microsoft
    url: https://github.com/umangsehgal
    image_url: https://github.com/umangsehgal.png
tags: [teams-sdk, cli, preview, announcement]
description: The Teams CLI Preview is one tool for the Teams app workflow. Scaffold a project, register a bot, diagnose configuration, manage permissions, and migrate hosting, all without portal navigation.
---

If you've ever shipped a Teams bot, you know the path: register an AAD app, generate a client secret and save it before the page navigates away, create a bot in the Developer Portal and wire its ID to the AAD app, hand-edit a manifest, start a tunnel, update the messaging endpoint, re-upload the manifest, drop three secrets into your `.env`. Each step works. The compounding cost is across them: too many surfaces, and too many places a wrong value can hide until three steps later when it surfaces as an opaque token error. The community-written guide for [getting an AI agent like OpenClaw into Teams](https://docs.openclaw.ai/channels/msteams) walks five separate surfaces (Azure AD, Bot Framework, manifest, tenant admin approval, Microsoft Graph permissions) for the same reason.

The Teams CLI Preview compresses that path into two commands. It also goes further: scaffolding, diagnostics, permission management, and hosting migration all live in the same tool.

<!-- truncate -->

## From scratch to a running bot

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams project new typescript my-bot --template echo
cd my-bot
teams app create --name "My Bot" --endpoint https://your-tunnel/api/messages --env .env
```

- **`teams login`** authenticates against Microsoft 365. Use `--device-code` for headless environments. Validates that your M365 and Azure CLI tenants match.
- **`teams project new`** scaffolds a runnable bot in TypeScript, C#, or Python. Templates: echo, AI agent, Microsoft Graph, MCP server, Teams tab.
- **`teams app create`** registers the AAD app, generates the client secret, creates and uploads the manifest, registers the bot, and writes credentials to `.env` (or `appsettings.json` for .NET projects).

Run the project, message it in Teams, and the bot replies.

:::note Screenshot needed
**File:** `screenshot-app-create.png`
**Show:** Terminal output of `teams app create` registering a bot end-to-end, with `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` printed at the end.
:::

## Self-diagnostics when something breaks

The hardest part of debugging a Teams bot is figuring out which surface to blame. The bot framework? The AAD app? An expired client secret? The manifest? SSO? `teams app doctor` runs the checks for you:

```bash
teams app doctor my-app-id
```

It checks:

- Bot location and Teams channel registration
- Endpoint reachability
- AAD app validity
- Client secret expiry
- Manifest format
- SSO wiring

Each check reports pass, warn, or fail with the specific configuration it inspected, so you know which value to fix.

:::note Screenshot needed
**File:** `screenshot-app-doctor.png`
**Show:** Terminal output of `teams app doctor` listing each diagnostic check with a pass, warn, or fail status.
:::

## Permissions you can diff

Resource-Specific Consent (RSC) permissions are how Teams apps request access to channel messages, team settings, and similar scoped resources. Managing them by hand means navigating to the Developer Portal, scrolling a checkbox list, and hoping the diff in your head matches the diff in the form.

The CLI manages RSC declaratively:

```bash
teams app rsc set my-app-id --permissions \
  TeamSettings.ReadWrite.Group \
  ChannelMessage.Read.Group
```

You declare the permissions you want; the CLI computes the diff against current and applies it. Output names every change:

```json
{
  "added": [{ "name": "TeamSettings.ReadWrite.Group", "type": "Application" }],
  "removed": [{ "name": "ChannelMessage.Read.Group", "type": "Application" }],
  "unchanged": []
}
```

`teams app rsc list`, `add`, and `remove` are also available if you'd rather mutate one permission at a time.

## Migrate hosting without breaking state

Teams bots come in two flavors:

- **Teams-managed** runs on Microsoft-provided infrastructure. Zero setup, but no OAuth or full bot framework features.
- **Azure-hosted** runs in your subscription. Full feature set.

Most teams start with Teams-managed and discover later that they need OAuth or SSO.

```bash
teams app bot migrate my-app-id --resource-group my-rg
```

The migration runs in stages:

1. Validation
2. Dry-run
3. Swap registration

If any stage fails, it rolls back automatically. Your client ID and tenant ID stay the same. Users don't see a thing.

:::note Screenshot needed
**File:** `screenshot-bot-migrate.png`
**Show:** Terminal output of `teams app bot migrate` running through the validation, dry-run, and swap stages.
:::

## Run it interactively, or script it

`teams app` with no arguments drops you into an interactive picker with arrow-key navigation. Useful when you don't remember an app ID, or you're exploring what's been registered to your tenant.

```bash
teams app create --name "My Bot" --endpoint $URL --env .env -y
```

`-y` confirms every prompt. Useful for CI, where you don't want a hung pipeline waiting on a "Continue?" no one's there to answer.

## Agent skills for Claude Code, Copilot, and Cursor

The CLI ships with a `teams-dev` skill for AI coding assistants. Install it once into Claude Code, GitHub Copilot CLI, Cursor, or VS Code:

```
/plugin marketplace add microsoft/teams-sdk
/plugin install teams-sdk@teams-skills
```

Then ask the assistant in natural language:

- *"Help me build a Teams bot that can answer FAQs"*
- *"My bot won't load in Teams, can you help?"*
- *"I need a chatbot for my team's standup meetings"*

The skill loads when the assistant detects a relevant request, then walks the CLI for you. It covers bot registration, development, configuration, and SSO setup. Hosting and deployment are out of scope.

:::note Screenshot needed
**File:** `screenshot-agent-skill-session.png`
**Show:** Example session of an AI coding assistant using the `teams-dev` skill to scaffold and register a Teams bot end-to-end.
:::

For agents that don't use a skill, every CLI command also supports stable `--json` help output:

```bash
teams app rsc --help --json
```

The shape is designed for programmatic discovery of commands, flags, and required arguments without parsing terminal text.

## What's next

- TODO
- TODO
- TODO

Install:

```bash
npm install -g @microsoft/teams.cli@preview
```

Full docs at [microsoft.github.io/teams-sdk](https://microsoft.github.io/teams-sdk/typescript/). Issues at [github.com/microsoft/teams-sdk](https://github.com/microsoft/teams-sdk/issues).
