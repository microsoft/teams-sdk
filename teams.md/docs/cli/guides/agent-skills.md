# Agent Skills

Agent skills are specialized assistants in Claude Code that help with specific workflows. Invoke them using slash commands (e.g., `/teams-dev`) or by describing your task in natural language.

---

## teams-dev

Create and manage Microsoft Teams bots using guided workflows for development, infrastructure setup, SSO configuration, and troubleshooting.

### How to use

**Slash command:**
```
/teams-dev
```

**Natural language:**
- "Help me create a new Teams bot"
- "Set up SSO for my bot"
- "Integrate Teams into my Express server"
- "My bot won't sideload in Teams"

### What it does

**Bot Development**
- Scaffold new bot projects (TypeScript, C#, Python)
- Choose templates: echo bot, AI bot, Graph bot
- Integrate Teams into existing Express/Flask/FastAPI servers

**Infrastructure**
- Create Teams-managed bots
- Register bots with Azure
- Generate and save credentials securely
- Update bot endpoints (for ngrok/devtunnels changes)

**SSO & Authentication**
- Migrate bots to Azure (when needed)
- Configure AAD app registration
- Set up OAuth connections
- Update Teams manifests

**Troubleshooting**
- Diagnose sideloading issues
- Fix authentication errors
- Resolve SSO configuration problems
- Debug bot migration issues

### Prerequisites

- **Teams CLI** - Install and authenticate with `teams login`
- **Azure CLI** - Required for SSO setup, authenticate with `az login`
- **Development tunnel** - ngrok or devtunnels for local testing

### Example workflow

```
User: /teams-dev create a new TypeScript AI bot

Claude: I'll help you create a new Teams AI bot. Let me guide you through
the bot application development process.

First, I'll check that you have the Teams CLI installed and you're
authenticated...
```

### Additional resources

- [Teams CLI Documentation](../index.md)
- [Teams SDK Documentation](https://microsoft.github.io/teams-sdk/welcome)
- [Microsoft Teams Platform](https://learn.microsoft.com/en-us/microsoftteams/platform/)
- [Dev Tunnels Setup](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)
