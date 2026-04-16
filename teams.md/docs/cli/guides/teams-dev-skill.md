# Using the teams-dev Skill with Claude Code

The `teams-dev` skill is a specialized agent in Claude Code that helps you create and manage Microsoft Teams bots using the Teams CLI. This skill provides guided workflows for bot development, infrastructure setup, SSO configuration, and troubleshooting.

## What is the teams-dev skill?

The teams-dev skill is an interactive assistant that:
- Scaffolds new Teams bot projects (TypeScript, C#, Python)
- Sets up bot infrastructure (registration, credentials)
- Configures SSO authentication
- Integrates Teams functionality into existing servers
- Troubleshoots common Teams bot issues

Unlike running CLI commands directly, the skill follows structured workflows, validates prerequisites, and provides contextual guidance throughout the process.

## How to invoke the skill

### From Claude Code

You can invoke the teams-dev skill in several ways:

**Using the slash command:**
```
/teams-dev
```

**Using natural language:**
Simply describe what you want to do with your Teams bot:
- "Help me create a new Teams bot"
- "I need to set up SSO for my bot"
- "Integrate Teams into my Express server"
- "My bot won't load in Teams"

Claude Code will recognize these requests and automatically invoke the teams-dev skill.

## What the skill can do

### Bot Application Development

**Scaffold a new bot project:**
The skill guides you through creating a new Teams bot using `teams project new`:
- Choose your language (TypeScript, C#, Python)
- Select a template (echo bot, AI bot, Graph bot, etc.)
- Optionally connect to existing infrastructure
- Set up your development environment

**Integrate with existing servers:**
Add Teams bot functionality to your existing Express, Flask, or FastAPI server using server adapters.

### Infrastructure Setup

**Create a Teams-managed bot:**
The skill walks you through:
1. Checking prerequisites (Teams CLI installation, authentication)
2. Creating a new bot with `teams app create`
3. Securely saving credentials (client ID, secret, tenant ID)
4. Verifying the setup

### SSO Configuration

**Set up Single Sign-On:**
The skill handles the complex SSO setup process:
1. Migrating to Azure-managed bot (if needed)
2. Configuring AAD app registration
3. Creating OAuth connections
4. Updating the Teams manifest
5. Verifying the configuration

### Troubleshooting

**Diagnose and fix common issues:**
- Sideloading problems
- Authentication errors
- SSO configuration issues
- Bot migration problems

## Common workflows

### Creating your first bot

1. Invoke the skill: `/teams-dev`
2. Request: "Create a new Teams bot"
3. Follow the guided workflow to:
   - Choose your language and template
   - Set up infrastructure
   - Save credentials
   - Start development

### Adding SSO to an existing bot

1. Invoke the skill: `/teams-dev`
2. Request: "Set up SSO for my bot"
3. Provide your bot's Teams App ID when prompted
4. Follow the workflow to:
   - Migrate to Azure (if needed)
   - Configure AAD settings
   - Create OAuth connection
   - Update manifest

### Updating your bot endpoint

When your development tunnel URL changes (ngrok, devtunnels):

1. Invoke the skill: `/teams-dev`
2. Request: "Update my bot endpoint"
3. The skill will run:
   ```bash
   teams app update <teamsAppId> --endpoint "https://your-new-url/api/messages"
   ```

## Example interactions

### Example 1: Create a new AI bot

```
User: /teams-dev help me create a new AI bot in TypeScript

Claude: I'll help you create a new Teams AI bot. Let me guide you through
the bot application development process.

First, I'll check that you have the Teams CLI installed and you're
authenticated...

[Follows guide-create-bot-app.md workflow]
```

### Example 2: Fix sideloading issue

```
User: My bot won't sideload in Teams, getting an error

Claude: I'll help troubleshoot your sideloading issue. Let me check the
troubleshooting guide for common solutions.

[Follows troubleshooting.md to diagnose the issue]
```

## Important notes

### Prerequisites

Before using the teams-dev skill, ensure you have:
- **Teams CLI** installed and authenticated (`teams login`)
- **Azure CLI** (for SSO setup) authenticated (`az login`)
- **Development tunnel** (ngrok or devtunnels) for local testing

### Structured guidance

The skill uses reference guides that provide step-by-step workflows. These guides are:
- `guide-create-bot-app.md` — Bot application development
- `guide-create-bot-infra.md` — Infrastructure setup
- `guide-integrate-existing-server.md` — Existing server integration
- `guide-setup-sso.md` — SSO configuration
- `troubleshooting.md` — Common issues and solutions

The skill follows these guides to ensure consistent, validated workflows.

### Skill limitations

The teams-dev skill:
- Uses only information from its reference guides and linked documentation
- Does not perform arbitrary web searches
- Validates prerequisites before starting complex workflows
- May prompt for required information (app IDs, resource groups, etc.)

## Getting help

If you encounter issues or have questions:
- Ask the skill for help: "How do I troubleshoot X?"
- Use `teams app doctor` to validate your bot configuration
- Check the [troubleshooting guide](../concepts/troubleshooting.md) for common issues

## Additional resources

- [Teams CLI Documentation](../index.md)
- [Teams SDK Documentation](https://microsoft.github.io/teams-sdk/welcome)
- [Microsoft Teams Platform Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/)
- [Dev Tunnels Setup](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)
