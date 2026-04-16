---
name: teams-dev
description: Create and manage Microsoft Teams bots using the Teams CLI. Covers bot application development (scaffolding bot code), infrastructure setup (bot registration, credentials), SSO configuration, and troubleshooting.
teams_cli_version: 2.1.0-preview.*
---

# Teams Bot Development & Infrastructure

This skill helps you create and manage Microsoft Teams bots using the Teams CLI. Covers both bot application development (creating bot code) and infrastructure management (bot registration, SSO, credentials).

**IMPORTANT:** Use information and guidance provided within this skill and its reference guides. You may also use external public documentation only when it is explicitly linked from this skill or those guides. Do NOT perform arbitrary web searches or rely on unlisted external sources.

## Workflow Routing

Based on the user's request, route to the appropriate guide or handle directly:

### Complex Workflows (Use References)

**Creating bot application code:**
- Read and follow the **[Bot Application Development guide](references/guide-create-bot-app.md)**
- This covers: Scaffolding a new bot project with `teams project new` (TypeScript/C#/Python, templates, connecting to infrastructure)

**Integrating Teams into an existing server:**
- Read and follow the **[Integrate Existing Server guide](references/guide-integrate-existing-server.md)**
- This covers: Adding Teams bot functionality to existing Express/Flask/FastAPI servers using server adapters (ExpressAdapter, FlaskAdapter)
- Supports: TypeScript (Express), Python (Flask, FastAPI)

**Setting up bot infrastructure (Teams-managed bot & credentials):**
- Read and follow the **[Bot Infrastructure Setup guide](references/guide-create-bot-infra.md)**
- This covers: Prerequisites → Create Teams-managed bot → Save credentials → Verify

**Setting up SSO authentication:**
- Read and follow the **[SSO Setup guide](references/guide-setup-sso.md)**
- This covers: Bot migration → AAD app configuration → OAuth connection → Manifest update → Verification
- Prerequisites: Existing bot (teamsAppId, botId), az CLI authenticated

**Troubleshooting errors:**
- Read the **[Troubleshooting guide](references/troubleshooting.md)**
- Covers: Sideloading issues, auth errors, SSO problems, migration issues

### Simple Operations (Handle Directly)

For simple queries and updates, handle directly using the commands below:

**List all apps:**
```bash
teams app list
```

**View app details:**
```bash
teams app get <teamsAppId> --json
```

**Check authentication status:**
```bash
teams status
```

**Update CLI to latest version:**
```bash
teams self-update
```

---

## Common Operations

### Update Bot Endpoint

**Use case:** Endpoint URL changed (new ngrok/devtunnels session)

**Command:**

```bash
teams app update <teamsAppId> --endpoint "https://new-endpoint-url/api/messages"
```

**When to use:**
- Ngrok URL changed (new session)
- Devtunnels URL changed
- Switching between different local development tunnels

### Update Teams CLI

**Use case:** Update the Teams CLI to the latest version (recommended to stay current with new features and bug fixes)

**Command:**

```bash
teams self-update
```

**When to use:**
- Periodically update to get latest features
- After bug reports or known issues
- When new CLI features are announced

**Expected:** CLI downloads and installs the latest version

### View App Details

**Command:**

```bash
teams app get <teamsAppId> --json
```

**Use case:** Check current bot configuration, verify settings

### List All Apps

**Command:**

```bash
teams app list
```

**Use case:** See all Teams apps you've created


## Resources

### Additional Resources

Additional resources for Teams bot development:

**Teams SDK Documentation:**
- https://microsoft.github.io/teams-sdk/welcome
- Comprehensive bot framework with built-in Teams features
- Supports TypeScript, JavaScript, Python, C#

### Setting Up Development Tunnels

**Microsoft devtunnels (Recommended):**
- https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows
- Microsoft's official tunneling solution
- Free for development use

**ngrok (Alternative):**
- https://ngrok.com
- Popular tunneling service
- Free tier available

### Teams App Development Documentation

**General Teams app development:**
- https://learn.microsoft.com/en-us/microsoftteams/platform/

**Bot-specific documentation:**
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots
