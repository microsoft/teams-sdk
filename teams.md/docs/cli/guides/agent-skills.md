# Agent Skills

The Teams CLI ships with an agent skill that lets AI coding assistants (Claude Code, Cursor, GitHub Copilot, and others) manage your Teams bot infrastructure on your behalf. Instead of running CLI commands manually, you describe what you want and your AI assistant handles the rest.

## Install the `teams-dev` skill

```bash
npx skills add microsoft/teams-sdk --skill teams-dev
```

To install all Teams CLI skills at once:

```bash
npx skills add microsoft/teams-sdk
```

## What the skill covers

The `teams-dev` skill guides your AI assistant through:

| Task | What it does |
|---|---|
| **Manage bot infrastructure** | Register your bot with Teams, manage credentials, and update configuration |
| **Develop Teams bot** | Build bot applications from scratch or add Teams capabilities to existing servers |
| **Set up SSO** | Enable Single Sign-On so users can authenticate seamlessly without login prompts |
| **Troubleshoot** | Diagnose and resolve common bot setup and configuration issues |

The skill does **not** cover hosting or deployment — it focuses on bot registration, development setup, and configuration.

## Invoke the skill

**Claude Code:**
```
/teams-dev
```

**Other agents:** Ask naturally — "create a Teams bot", "set up Teams bot infrastructure", or "configure Teams bot credentials". The skill loads automatically when the agent detects a relevant request.

## Example session

```
You: Create a Teams bot called echo-agent with endpoint https://abc123.ngrok.io/api/messages

Agent: [runs teams login → teams app create → saves .env → verifies credentials]
       Done. Your bot is registered. Credentials written to .env:
       CLIENT_ID=...
       CLIENT_SECRET=...
       TENANT_ID=...
```

## Requirements

- Teams CLI installed (`npm install -g @microsoft/teams.cli`)
- Node.js 20 or later
- Microsoft 365 account with sideloading enabled

## Resources

- [Quickstart: Register your app](/get-started/quickstart-register) — the manual version of what the skill automates
- [Agent Skills standard](https://agentskill.sh/) — how skills work across different AI coding assistants
