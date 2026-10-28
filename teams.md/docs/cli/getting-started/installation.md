# Installation

## Prerequisites

- **Node.js** 22.12 or later
- **npm** (comes with Node.js)
- **Azure CLI** (`az`) — only needed for Azure bot operations (optional)

## Install

Check your Node.js version, then install `teams` globally from npm:

```bash
node --version   # must be 22.12 or later
npm install -g @microsoft/teams.cli@latest
```

:::warning
On Node.js older than 22.12, npm doesn't fail — it silently installs an outdated CLI release (3.0.3) that still supports the older runtime. Upgrade Node.js first, then reinstall.
:::

## Verify

```bash
teams --version
```

You should see `3.0.4` or later. If you see an older version, check `node --version` and reinstall after upgrading Node.js.

## Update

The CLI checks for updates automatically once per day. To update manually:

```bash
teams self-update
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
