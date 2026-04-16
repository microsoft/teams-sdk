# TDP Portal Equivalents

The Teams Developer Portal (TDP) is the web UI at [dev.teams.microsoft.com](https://dev.teams.microsoft.com) for managing Teams apps. teams provides CLI equivalents for most portal operations — and some that go beyond what the portal offers.

## Command-to-Portal Mapping

| CLI Command | Portal Equivalent |
|-------------|-------------------|
| `teams app list` | Apps → app list |
| `teams app create` | Apps → New app *(CLI also handles AAD + bot registration in one step)* |
| `teams app get` | Apps → select app → overview |
| `teams app update` | Apps → select app → Basic information |
| `teams app manifest download` | Apps → select app → App package → Download |
| `teams app package download` | Apps → select app → App package → Download (full zip) |
| `teams app doctor` | *No portal equivalent* |
| `teams app bot get` | Apps → select app → App features → Bot (location shown) |
| `teams app bot migrate` | *No portal equivalent* |
| `teams app auth secret create` | Azure Portal → App registrations → Certificates & secrets |
| `teams config` | *No portal equivalent* |

## Key Differences

### App Creation

In the portal, creating a Teams app and registering a bot are separate steps. In teams, `app create` does everything in a single command:

1. Creates an AAD app (via TDP API)
2. Generates a client secret (via Graph API)
3. Generates and imports the manifest (via TDP API)
4. Registers the bot (via TDP or Azure)

### SSO Setup

SSO setup in the portal requires jumping between three different UIs:
- Azure Portal → App registrations (identifier URI, scopes, pre-auth clients)
- Azure Portal → Bot Service (OAuth connection)
- TDP → App manifest (webApplicationInfo)

For streamlined SSO and OAuth setup, see the [User Authentication Setup guide](../guides/user-authentication-setup) or use the **teams-dev** skill.

### App Doctor

`teams app doctor` has no portal equivalent. It cross-references data from TDP, Graph, and Azure to verify your app is correctly configured — checking bot registration, AAD app health, manifest consistency, and SSO configuration.

### Bot Migration

The portal doesn't support migrating a bot to Azure. `teams app bot migrate` handles the full lifecycle: validation, removal of the old registration, Azure creation, and automatic rollback on failure.
