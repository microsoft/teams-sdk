# Bot Locations: Teams-Managed vs Azure

When you create a bot for a Teams app, the bot registration can live in one of two places. Understanding the difference is key to choosing the right approach.

## Teams-Managed

A **Teams-managed** bot is registered in a Microsoft-managed environment via the Teams Developer Portal (TDP). When you run `teams app create` (without `--azure`), the registration goes here.

**Pros:**
- No Azure subscription needed
- Zero infrastructure to manage
- Fastest path to a working bot
- Works for production too, as long as you don't need OAuth/SSO

**Cons:**
- No OAuth connection management (can't add OAuth providers)
- No SSO configuration
- Limited control over the registration

## Azure Bot

An **Azure bot** is a bot registration in your own Azure subscription (via Azure Bot Service). You get full control over the registration and access to features that require Azure.

**Pros:**
- Full OAuth connection support (see [authentication guide](../guides/user-authentication-setup))
- SSO configuration (see [authentication guide](../guides/user-authentication-setup))
- Managed via Azure Portal or `az` CLI
- Enterprise-grade control and auditing

**Cons:**
- Requires an Azure subscription
- Requires Azure CLI (`az`) to be installed and logged in
- Requires a resource group

## Choosing a Location

Use Azure only when your bot needs **OAuth or SSO** — that's the one thing Teams-managed can't do. For everything else, Teams-managed is the simpler choice. The decision isn't permanent: you can always migrate later with `teams app bot migrate`.

| Scenario | Recommended |
|----------|------------|
| Prototyping or development | Teams-managed |
| Need OAuth or SSO | Azure (or migrate later) |
| No Azure subscription available | Teams-managed |

## Default Location

By default, `teams app create` uses Teams-managed. Override this per-command:

```bash
teams app create --name "My Bot" --azure --resource-group my-rg
teams app create --name "My Bot" --teams-managed
```

Or set a persistent default:

```bash
teams config set default-bot-location azure
```

**Precedence:** explicit flag (`--azure`/`--teams-managed`) > saved config > Teams-managed default.

## Migration

If you try to use a feature that requires Azure (like OAuth or SSO) on a Teams-managed bot, the CLI will automatically detect this and offer to migrate your bot for you.

You can also migrate manually at any time without changing your AAD app or credentials:

```bash
teams app bot migrate <appId> --resource-group my-rg
```

See [app bot migrate](../commands/app/bot-migrate) for details. The migration:

1. Validates the bot is not already in Azure
2. Removes the Teams-managed registration
3. Creates an Azure Bot resource
4. Automatically rolls back if step 3 fails

Your `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` remain unchanged. However, some features need manual reconfiguration after migration:

- **M365 Extensions channel** — must be re-enabled in Azure Portal
- **Calling endpoint** — must be reconfigured if previously set
