# SSO Setup Guide

Configure Single Sign-On so your bot can acquire access tokens silently — no login prompt for the user.

## Prerequisites for SSO

- **`az` CLI installed and authenticated:** Run `az --version` and `az account show`. Log in with `az login` using the **same Microsoft account** used for `teams login`.
- **`teamsAppId` and `botId`** from bot creation output (or run `teams app get <teamsAppId> --json` to retrieve them).
- **`TENANT_ID`** from your `.env` file (or `TenantId` from `appsettings.json` for C# projects).

---

## Step 1: Check Bot Location — Migrate if Needed

SSO requires an Azure-managed bot. Check:

```bash
teams app bot get <teamsAppId>
```

Look at the `Location` in the output:
- `Azure` → proceed to Step 2, note the `resourceGroup` and `subscription` for your Azure bot
- `Teams (managed)` → migrate first:

```bash
teams app bot migrate <teamsAppId> --resource-group <your-resource-group>
```

Save `resourceGroup` and `subscription` from the migration output — required in later steps.

---

## Step 2: Get Client Secret

The OAuth connection requires the bot's client secret.

**Option A — Read from credentials file:** Use the `CLIENT_SECRET` value from your `.env` file (or `ClientSecret` from `appsettings.json` for C# projects).

**Option B — Generate a new secret:**
```bash
teams app auth secret create <teamsAppId> --json
```
Save the `CLIENT_SECRET` from the output.

---

## Step 3: Look Up the AAD App Object ID

The Graph object ID differs from the bot's `clientId`. Query it:

```bash
az rest \
  --method GET \
  --uri "https://graph.microsoft.com/v1.0/applications?\$filter=appId eq '<botId>'" \
  --query "value[0].id" \
  --output tsv
```

Save the result as `<objectId>`.

---

## Step 4: Generate a Scope UUID

The `access_as_user` scope needs a stable unique identifier:

```bash
python3 -c "import uuid; print(uuid.uuid4())"
```

Save the result as `<scopeId>`.

---

## Step 5: Configure the AAD App — PATCH 1

Set the identifier URI, `access_as_user` scope, Bot Framework redirect URI, and token version. Write the request body to a file, substituting `<botId>` and `<scopeId>`:

**`patch1.json`:**
```json
{
  "identifierUris": ["api://botid-<botId>"],
  "api": {
    "requestedAccessTokenVersion": 2,
    "oauth2PermissionScopes": [
      {
        "id": "<scopeId>",
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

Apply it:
```bash
az rest \
  --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/applications/<objectId>" \
  --headers "Content-Type=application/json" \
  --body @patch1.json
```

**Verify:**
```bash
az rest \
  --method GET \
  --uri "https://graph.microsoft.com/v1.0/applications/<objectId>" \
  --query "{identifierUris: identifierUris, scopes: api.oauth2PermissionScopes[*].value, redirectUris: web.redirectUris}"
```

Expected: `identifierUris` contains `api://botid-<botId>`, `scopes` contains `access_as_user`, `redirectUris` contains `https://token.botframework.com/.auth/web/redirect`.

---

## Step 6: Pre-Authorize Teams Clients — PATCH 2

Pre-authorize the Teams desktop and web clients so they can silently acquire SSO tokens. Write the body, substituting `<scopeId>`:

**`patch2.json`:**
```json
{
  "api": {
    "oauth2PermissionScopes": [
      {
        "id": "<scopeId>",
        "adminConsentDescription": "Access as user",
        "adminConsentDisplayName": "Access as user",
        "isEnabled": true,
        "type": "User",
        "value": "access_as_user"
      }
    ],
    "preAuthorizedApplications": [
      {
        "appId": "1fec8e78-bce4-4aaf-ab1b-5451cc387264",
        "delegatedPermissionIds": ["<scopeId>"]
      },
      {
        "appId": "5e3ce6c0-2b1f-4285-8d4b-75ee78787346",
        "delegatedPermissionIds": ["<scopeId>"]
      }
    ]
  }
}
```

Apply it:
```bash
az rest \
  --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/applications/<objectId>" \
  --headers "Content-Type=application/json" \
  --body @patch2.json
```

> **Note:** PATCH 2 must run after PATCH 1 because the pre-authorized apps reference `<scopeId>`, which must exist first. If PATCH 2 fails with a scope-not-found error, wait 15 seconds and retry (AAD replication lag).

**Verify:**
```bash
az rest \
  --method GET \
  --uri "https://graph.microsoft.com/v1.0/applications/<objectId>" \
  --query "api.preAuthorizedApplications[*].appId"
```

Expected: Both `1fec8e78-bce4-4aaf-ab1b-5451cc387264` and `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` appear in the list.

---

## Step 7: Create the Azure Bot OAuth Connection

```bash
az bot authsetting create \
  --name <botId> \
  --resource-group <resourceGroup> \
  --setting-name "sso" \
  --service Aadv2 \
  --client-id <botId> \
  --client-secret <clientSecret> \
  --provider-scope-string "User.Read" \
  --parameters tenantId=<tenantId> tokenExchangeUrl=api://botid-<botId> \
  --subscription <subscription>
```

> **Scopes:** `User.Read` covers basic user profile. To include additional Graph permissions, space-delimit them: `"User.Read Mail.Read"`. For SharePoint or custom APIs, server-side On-Behalf-Of (OBO) token exchange in bot code is required.

> **Connection name:** The connection is named `sso`. Your bot code must reference this exact name when initiating token exchange.

**Verify:**
```bash
az bot authsetting show \
  --name <botId> \
  --resource-group <resourceGroup> \
  --setting-name "sso" \
  --subscription <subscription>
```

Expected: Connection returned with `properties.parameters` containing `tokenExchangeUrl=api://botid-<botId>`.

---

## Step 8: Set webApplicationInfo

```bash
teams app update <teamsAppId> \
  --web-app-info-id "<botId>" \
  --web-app-info-resource "api://botid-<botId>"
```

This sets the SSO identity fields directly via the API — no manifest download/edit/upload needed, and no app reinstall required.

---

## Step 9: Final Verification

Run the doctor to validate the complete SSO configuration end-to-end:

```bash
teams app doctor <teamsAppId>
```

**Expected — all SSO checks pass:**
- Identifier URI: `api://botid-<botId>` ✔
- `access_as_user` scope ✔
- Teams clients pre-authorized ✔
- Bot Framework redirect URI present ✔
- OAuth `"sso"` — URIs aligned ✔

**Checkpoint:** SSO is fully configured and verified.

---

## Next Steps

- Your bot can now acquire access tokens silently in Teams
- Reference the `"sso"` connection name in your bot code when implementing token exchange
- For troubleshooting SSO issues, see the [Troubleshooting guide](troubleshooting.md)
- For managing OAuth connections, see Common Operations in the main skill
