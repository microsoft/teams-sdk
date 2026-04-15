# Teams CLI Skills

Agent skills for managing Microsoft Teams bot infrastructure using the Teams CLI.

## Available Skills

### teams-dev

Manage Microsoft Teams bot infrastructure using the Teams CLI. This skill guides AI coding assistants through creating, configuring, and troubleshooting Teams bot apps and registrations.

**Use when:**
- Creating a new Teams bot
- Configuring bot credentials and endpoints
- Setting up SSO (Single Sign-On) for a Teams bot
- Troubleshooting Teams bot setup
- Managing Teams bot infrastructure

**Does NOT cover:**
- Building bot application code
- Hosting or deploying bot code
- Bot development patterns

**What it includes:**
- Complete bot creation workflow (CLI install → auth → create → verify)
- SSO setup workflow (AAD app configuration, Azure Bot OAuth connection, manifest update)
- Verification checkpoints with evidence requirements
- Common operations (update endpoint, view apps, update CLI, manage OAuth connections)
- Error recovery (authentication issues, sideload disabled)
- Resource links (Teams SDK, devtunnels, documentation)

## Installation

Install skills using the `skills` CLI tool:

```bash
npx skills add microsoft/teams-sdk --skill teams-dev
```

This installs the `teams-dev` skill for use with AI coding assistants like Claude Code, Cursor, GitHub Copilot, and others.

### Install All Skills

To install all Teams CLI skills at once:

```bash
npx skills add microsoft/teams-sdk
```

## Usage

Once installed, the skills are automatically available to AI coding assistants. Agents will load the appropriate skill when you ask about:

- "Create a Teams bot"
- "Set up Teams bot infrastructure"
- "Configure Teams bot credentials"
- "Troubleshoot Teams bot setup"
- "Update bot endpoint"

### Manual Invocation

You can also explicitly invoke a skill in compatible agents:

**Claude Code:**
```
/teams-dev
```

**Other agents:** Check your agent's documentation for skill invocation syntax.

## Skill Structure

```
skills/
├── README.md                    (this file)
└── teams-dev/
    └── SKILL.md                 (skill instructions)
```

## Requirements

These skills require:
- **Teams CLI** - Install via: `npm install -g @microsoft/teams.cli`
- **Node.js** - Required for Teams CLI
- **Microsoft account** - For Teams authentication

## Contributing

Skills are developed using the agent skills development lifecycle:

1. **Discovery** - Document real workflows by executing them
2. **Architecture** - Design modular, focused skills
3. **Development** - Write workflows (not documentation) with verification checkpoints
4. **Testing** - Validate against real scenarios
5. **Distribution** - Package and publish

See the [teams-dev development](https://github.com/microsoft/teams-sdk/issues/37) for an example of this process.

## Resources

- **Teams CLI Documentation**: https://microsoft.github.io/teams-sdk/cli
- **Agent Skills Standard**: https://code.claude.com/docs/en/skills
- **Skills Marketplace**: https://agentskill.sh/

## License

MIT - See [LICENSE](../LICENSE) for details
