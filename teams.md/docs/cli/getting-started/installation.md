# Installation

## Prerequisites

- **Node.js** 20 or later
- **npm** (comes with Node.js)
- **Azure CLI** (`az`) — only needed for Azure bot operations (optional)

## Install

Install `teams` globally from npm:

```bash
npm install -g @microsoft/teams.cli@preview
```

## Verify

```bash
teams --version
```

## Update

The CLI checks for updates automatically on each run. To update manually:

```bash
teams self-update
```

Disable auto-update checks with:

```bash
teams --disable-auto-update <command>
```

## Azure CLI (Optional)

If you plan to create Azure bots or configure OAuth/SSO, install the [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli):

```bash
# macOS
brew install azure-cli

# Windows
winget install Microsoft.AzureCLI
```

Then sign in:

```bash
az login
```
