# Teams Developer CLI

[![npm version](https://img.shields.io/npm/v/@microsoft/teams.cli.svg)](https://www.npmjs.com/package/@microsoft/teams.cli)

Teams Developer CLI helps you create, configure, and manage Microsoft Teams apps from the command line. Use it to scaffold projects, register Teams apps and bots, manage manifests and packages, configure authentication, and automate common app lifecycle tasks.

## Install

```bash
npm install -g @microsoft/teams.cli
```

## Usage

```bash
teams
```

This launches the interactive CLI. You can also run commands directly for scripting and automation.

## Documentation

For command reference, guides, and examples, see:

https://aka.ms/teamscli

## Automation

Use these options for CI and agent workflows:

| Flag                    | Description                            |
| ----------------------- | -------------------------------------- |
| `--json`                | Output structured JSON where supported |
| `--yes` / `-y`          | Skip confirmation prompts              |
| `--disable-auto-update` | Disable automatic update checks        |
| `-v, --verbose`         | Enable verbose logging                 |

Set `TEAMS_NO_INTERACTIVE=1` to disable interactive prompts entirely.

## AI Agent Skills

Use Teams developer skills to help AI assistants manage Teams bot infrastructure:

https://aka.ms/Teams-Skills

## Issues

Report CLI issues at https://aka.ms/teams-cli-issues.

## License

MIT
