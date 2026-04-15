# @microsoft/teams.cli

CLI for managing Microsoft Teams apps.

## Install

```bash
npm install -g @microsoft/teams.cli
```

## Usage

```bash
teams
```

This launches an interactive CLI. You can also run specific commands directly:

```bash
teams login                          # Sign in with your Microsoft account
teams logout                         # Sign out
teams status                         # Check authentication status
teams app                            # Manage a Teams app (interactive menu)
teams app list                       # List your Teams apps
teams app create                     # Create a new Teams app with bot
teams app get [appId]                # Get a Teams app
teams app update [appId]             # Update app properties
teams app doctor [appId]             # Run diagnostic checks
teams app manifest download [appId]  # Download manifest
teams app manifest upload [appId]    # Upload manifest
teams app package download [appId]   # Download app package
teams app bot get [appId]            # Get bot location (Teams-managed vs Azure)
teams app bot migrate [appId]        # Migrate bot to Azure
teams app auth secret create [appId] # Generate a client secret
teams app rsc list [appId]           # List RSC permissions
teams app rsc add [appId]            # Add RSC permission
teams app rsc remove [appId]         # Remove RSC permission
teams app rsc set [appId]            # Declaratively set RSC permissions
teams project new                    # Create a new Teams app project
teams config                         # Manage CLI configuration
teams self-update                    # Update to the latest version
```

## Global Options

| Flag | Description |
|------|-------------|
| `-v, --verbose` | Enable verbose logging |
| `--json` | Output results as JSON (structured output, recommended for agents) |
| `--yes` / `-y` | Skip confirmation prompts (CI/agent use) |
| `--disable-auto-update` | Disable automatic update checks |

## AI Agent Skills

Install agent skills to help AI assistants manage Teams bot infrastructure:

```bash
npx skills add microsoft/teams-sdk --skill teams-dev
```

See [skills/README.md](skills/README.md) for details.

## License

MIT
