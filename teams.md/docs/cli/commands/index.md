# Command Reference

All teams commands. Run any command with `--help` for inline usage.

## Global Options

| Flag | Description |
|------|-------------|
| `-v, --verbose` | Enable verbose logging |
| `-y, --yes` | Auto-confirm prompts (for CI/agent use) |
| `--disable-auto-update` | Disable automatic update checks |
| `-V, --version` | Show version |
| `-h, --help` | Show help (use with `--json` for structured output) |

## Command Tree

```
teams
├── login                          Log in to Microsoft 365
├── logout                         Log out of Microsoft 365
├── status                         Show current CLI status
├── app                            Manage Teams apps (interactive menu)
│   ├── list                       List your Teams apps
│   ├── create                     Create a new Teams app with bot
│   ├── get [appId]                Get a Teams app
│   ├── update [appId]             Update app properties
│   ├── doctor [appId]             Run diagnostic checks
│   ├── manifest
│   │   ├── download [appId]       Download manifest
│   │   ├── upload [appId]         Upload manifest
│   │   └── update [appId]         Update manifest fields
│   ├── package
│   │   └── download [appId]       Download app package
│   ├── bot
│   │   ├── get [appId]            Get bot location
│   │   └── migrate [appId]        Migrate bot to Azure
│   ├── rsc
│   │   ├── list <teamsAppId>      List RSC permissions
│   │   ├── add <teamsAppId>       Add RSC permission
│   │   ├── remove <teamsAppId>    Remove RSC permission
│   │   └── set <teamsAppId>       Declaratively set RSC permissions
│   └── auth
│       └── secret
│           └── create [appId]     Generate client secret
├── project                        Create and configure Teams app projects
│   └── new                        Create a new Teams app project
│       ├── typescript <name>      Create a new TypeScript Teams app
│       ├── csharp <name>          Create a new C# Teams app
│       └── python <name>          Create a new Python Teams app
├── config                         Manage CLI configuration
│   ├── get [key]                  Show configuration values
│   └── set <key> [value]          Set a configuration value
└── self-update                    Update to latest preview version
```

## Structured Help

Use `--help --json` on any command to get the command tree as structured JSON — useful for AI agents and tooling that need to discover CLI capabilities programmatically:

```bash
teams --help --json          # Full command tree with version
teams app --help --json      # Subtree for 'app'
teams app rsc --help --json  # Subtree for 'app rsc'
```

## Interactive vs Scripted

Most commands work in two modes:

- **Interactive** — omit the `[appId]` argument and the CLI presents a searchable app picker. Subcommands like `app` and `app manifest` show action menus.
- **Scripted** — pass `[appId]` and all required flags directly for CI/CD or automation. Use `--json` where available for structured output.

Set `TEAMS_NO_INTERACTIVE=1` to disable interactive prompts entirely.
