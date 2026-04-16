# Agent Skills

The `teams-dev` skill is the go-to agent skill for Teams bot development. It lets AI coding assistants (Claude Code, Cursor, GitHub Copilot, and others) use the Teams CLI to manage your bot infrastructure. Instead of running CLI commands manually, you describe what you want and your AI assistant handles the rest.

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

The skill does **not** cover hosting or deployment — it focuses on bot registration, development, and configuration.

## Invoke the skill

**Using natural language** (all agents including Claude Code):
- "Create a Teams bot"
- "Set up Teams bot infrastructure"
- "Configure Teams bot credentials"

The skill loads automatically when your agent detects a relevant request.

**Claude Code shortcut:**
```
/teams-dev
```

## Example session

```
You: Help me create a Teams bot that echoes what I'm saying back to me

Agent: I'll help you create an echo bot. Let me set up the infrastructure,
       create the bot code, and get your development environment running.

       Step 1: Creating bot infrastructure
       [runs teams login → teams app create]
       ✓ Bot registered. Credentials saved to .env

       Step 2: Setting up bot code
       [runs teams project new typescript echo-bot --template echo]
       ✓ Created echo-bot/ with TypeScript starter code

       Step 3: Setting up local dev environment
       [runs npm install → starts dev server]
       ✓ Bot running on http://localhost:3978
       ✓ Tunnel created: https://abc123.ngrok.io

       Step 4: Install in Teams
       ✓ Ready to install: https://teams.microsoft.com/l/app/[app-id]

       Your echo bot is ready! Click the link above to add it to Teams.
```

## Requirements

- Teams CLI installed (`npm install -g @microsoft/teams.cli`)
- Node.js 20 or later
- Microsoft 365 account with sideloading enabled

## Resources

- [Agent Skills standard](https://agentskills.io/what-are-skills) — how skills work across different AI coding assistants
