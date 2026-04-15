# User Authentication Setup Guide

This guide shows you how to set up SSO and OAuth authentication for your Teams bot using the Azure CLI and Microsoft Graph API. Use this guide to implement authentication workflows in skills, scripts, or external tooling.

---

## Prerequisites

Before setting up SSO or OAuth, ensure your bot meets these requirements:

### Azure-Managed Bot Required

Your bot must be **Azure-managed** (not Teams-managed). If your bot is Teams-managed, migrate it to Azure first using:

```bash
teams app bot migrate <appId> --resource-group <your-resource-group>
```

### Required Tools and Authentication

1. **Teams CLI** — Log in with `teams login`
2. **Azure CLI** — Install and authenticate with `az login`
3. **Bot Context** — You'll need these values for all operations:
   - `botId` — Your bot's client ID
   - `azure.subscription` — Azure subscription ID
   - `azure.resourceGroup` — Resource group containing the bot
   - `azure.tenantId` — Azure AD tenant ID

You can discover these values using `teams app bot get <appId>` and `az bot show`.

---

## Understanding SSO vs OAuth

SSO builds on top of the same Azure Bot Service OAuth connection infrastructure as generic OAuth. Both use `az bot authsetting create` and both appear in `az bot authsetting list`. However, SSO has additional requirements:

| | Generic OAuth | SSO |
|---|---|---|
| `az bot authsetting create` | any provider | `Aadv2` only |
| `tokenExchangeUrl` parameter | not set | required (`api://botid-{botId}`) |
| AAD app identifier URI | not required | required (`api://botid-{botId}`) |
| `access_as_user` scope | not required | required |
| Teams clients pre-authorized | not required | required |
| `requestedAccessTokenVersion` | not required | must be `2` |
| Bot Framework redirect URI | required | required |
| Manifest `webApplicationInfo` | not required | required |

---

## Setting Up SSO

### Complete SSO Setup

Setting up SSO requires three sequential steps:

#### Step 1: AAD App Configuration (Microsoft Graph)

Two separate PATCH requests to `PATCH /v1.0/applications/{objectId}` — the scope must be created **before** pre-authorized apps reference it.

**PATCH 1 — identifier URI, scope, redirect URI, token version:**
```json
{
  "identifierUris": ["api://botid-{botId}"],
  "api": {
    "requestedAccessTokenVersion": 2,
    "oauth2PermissionScopes": [
      {
        "id": "<uuid>",
        "adminConsentDescription": "Access as user",
        "adminConsentDisplayName": "Access as user",
        "isEnabled": true,
        "type": "User",
        "value": "access_as_user"
      }
    ]
  },
  "web": {
    "redirectUris": ["https://token.botframework.com/.auth/web/redirect"]
  }
}
```

> **Key detail:** `requestedAccessTokenVersion: 2` must be set. Teams issues v2 tokens (AAD v2 endpoint); if the app is still configured for v1, the token exchange will fail because the formats don't match.

**PATCH 2 — pre-authorized apps** (after scope exists):
```json
{
  "api": {
    "oauth2PermissionScopes": [ /* same as above */ ],
    "preAuthorizedApplications": [
      {
        "appId": "1fec8e78-bce4-4aaf-ab1b-5451cc387264",
        "delegatedPermissionIds": ["<scope-uuid>"]
      },
      {
        "appId": "5e3ce6c0-2b1f-4285-8d4b-75ee78787346",
        "delegatedPermissionIds": ["<scope-uuid>"]
      }
    ]
  }
}
```

The two pre-authorized app IDs are:
- `1fec8e78-bce4-4aaf-ab1b-5451cc387264` — Teams desktop/mobile client
- `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` — Teams web client

> **Key detail:** The `identifierUri` must be `api://botid-{botId}` — the `botid-` prefix is required. Teams validates this with a regex; using `api://{botId}` without the prefix will silently fail SSO.

> **Key detail:** The Graph object ID (`aadApp.id`) differs from the bot's client ID (`botId`). The CLI looked up the object ID via `GET /v1.0/applications?$filter=appId eq '{botId}'` before PATCHing.

#### Step 2: Azure Bot OAuth Connection

```bash
# default connectionName: "sso"
# default scopes: "User.Read"
az bot authsetting create \
  --name {botId} \
  --resource-group {resourceGroup} \
  --setting-name {connectionName} \
  --service Aadv2 \
  --client-id {botId} \
  --client-secret {clientSecret} \
  --provider-scope-string {scopes} \
  --parameters \
    tenantId={tenantId} \
    tokenExchangeUrl=api://botid-{botId} \
  --subscription {subscription}
```

> **Key detail:** `tokenExchangeUrl` must exactly match the `identifierUri` from Step 1.

> **Key detail:** A client secret is required. The CLI either accepted one via `--client-secret`, prompted for one, or auto-created one via `POST /v1.0/applications/{objectId}/addPassword`.

#### Step 3: TDP Manifest Update

Called `PATCH /api/v1.0/apps/{appId}` (TDP internal API) with:
```json
{
  "webApplicationInfoId": "{botId}",
  "webApplicationInfoResource": "api://botid-{botId}",
  "validDomains": ["*.botframework.com"]
}
```

If this step fails, SSO is still partially configured and you can update the manifest manually via Developer Portal.

### Listing SSO Connections

To list all SSO connections, use:

```bash
az bot authsetting list \
  --name {botId} \
  --resource-group {resourceGroup} \
  --subscription {subscription}
```

Filter to AAD connections by checking if `properties.serviceProviderDisplayName` contains `"Azure Active Directory"`. Then fetch each candidate with `az bot authsetting show` and check for a `tokenExchangeUrl` parameter — only connections with this parameter are SSO connections.

### Updating SSO Connections

The Azure CLI doesn't have an `az bot authsetting update` command. To update an SSO connection:

1. Fetch the existing connection with `az bot authsetting show`
2. Delete the old connection with `az bot authsetting delete`
3. Recreate it with `az bot authsetting create` using the new settings (scopes or name)

You'll need a new client secret for the recreate step.

### Removing SSO Connections

To remove an SSO connection:

```bash
az bot authsetting delete \
  --name {botId} \
  --resource-group {resourceGroup} \
  --setting-name {connectionName} \
  --subscription {subscription}
```

**Important:** This only removes the OAuth connection. You'll need to manually clean up the AAD app registration (identifier URI, scopes, pre-authorized apps) and the manifest `webApplicationInfo` field.

---

## Setting Up OAuth

### Adding OAuth Connections

You can add OAuth connections for any provider supported by Azure Bot Service (Aadv2, GitHub, Google, etc.).

#### Step 1: Create the OAuth connection

```bash
az bot authsetting create \
  --name {botId} \
  --resource-group {resourceGroup} \
  --setting-name {connectionName} \
  --service {provider} \              # e.g. Aadv2, GitHub, Google
  --client-id {clientId} \
  --client-secret {clientSecret} \
  --provider-scope-string {scopes} \
  --parameters {key=value ...} \      # optional extra params
  --subscription {subscription}
```

The list of available providers was fetched via:
```bash
az bot authsetting list-providers
```

#### Step 2: Add Bot Framework redirect URI to Entra app

Via Graph API (same pattern as SSO Step 1):
```
PATCH /v1.0/applications/{objectId}
{
  "web": {
    "redirectUris": ["https://token.botframework.com/.auth/web/redirect"]
  }
}
```

If this step fails, you can add it manually: Entra portal → App registrations → Authentication → Web → Redirect URIs → `https://token.botframework.com/.auth/web/redirect`

#### Step 3: Update TDP manifest validDomains

```json
{ "validDomains": ["*.botframework.com"] }
```

If this fails, add it manually: Developer Portal → App → Domains → add `*.botframework.com`.

### Listing OAuth Connections

To list all OAuth connections:

```bash
az bot authsetting list \
  --name {botId} \
  --resource-group {resourceGroup} \
  --subscription {subscription}
```

This returns all connections regardless of provider type (unlike SSO listing which filters to AAD).

### Removing OAuth Connections

To remove an OAuth connection:

```bash
az bot authsetting delete \
  --name {botId} \
  --resource-group {resourceGroup} \
  --setting-name {connectionName} \
  --subscription {subscription}
```

---

## How SSO Works: Token Exchange Flow

Once you've configured SSO, here's how the silent authentication flow works:

```
1. User opens bot in Teams
   ↓
2. Teams client requests SSO token from AAD
   (using pre-authorized client ID and api://botid-{botId} scope)
   ↓
3. Teams sends the token to the bot via an invoke activity
   ↓
4. Bot forwards token to Azure Bot Service
   ↓
5. Bot Service exchanges SSO token for an access token
   (using the OAuth connection's tokenExchangeUrl = api://botid-{botId})
   ↓
6. Bot receives access token with the requested scopes (e.g. User.Read)
```

The user sees no login prompt — the flow is completely silent when the AAD app is correctly configured.

---

## Troubleshooting

Use `teams app doctor` to verify your SSO configuration. It checks:

- Identifier URI format (`api://botid-{botId}`)
- `access_as_user` scope exists
- Teams clients are pre-authorized
- Bot Framework redirect URI is present
- OAuth connection `tokenExchangeUrl` matches the identifier URI
