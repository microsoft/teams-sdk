# AAD App Lifecycle

Every Teams bot needs an Azure Active Directory (AAD) app registration. This page explains how teams creates and manages AAD apps.

## Why TDP Creates AAD Apps

teams creates AAD apps through the Teams Developer Portal (TDP) API (`/aadapp/v2`), **not** through the Microsoft Graph API directly.

The reason: TDP's backend creates the **service principal** server-side as part of the app creation. A service principal is required for single-tenant bot registration (SFI requirement), and creating it via Graph would require additional API calls and permissions.

## The ID Mapping Issue

TDP returns an `id` field for the newly created AAD app, but this is **not** the same as the Graph API's object ID. When teams needs to perform Graph operations (like creating a client secret), it must:

1. Look up the app by `clientId` using `GET /applications?$filter=appId eq '{clientId}'`
2. Use the Graph object ID from the response
3. Retry with backoff — Graph API has replication lag after TDP creates the app

This lookup-with-retry pattern is used by `app create` and `app auth secret create`.

## Sign-In Audience

AAD apps created by teams use:

- `signInAudience: AzureADMultipleOrgs` — the app accepts sign-ins from any Azure AD tenant

This is required even though bot registration uses `isSingleTenant: true`. Using `AzureADMyOrg` (single org) causes service principal creation to fail silently.

## Credential Flow

The full flow when teams creates a new app:

```
1. TDP creates AAD app (/aadapp/v2)
   ↓
2. Graph lookup by clientId (with retry for replication lag)
   ↓
3. Graph creates client secret (addPassword)
   ↓
4. TDP imports app package (manifest + icons)
   ↓
5. TDP or Azure registers bot
   ↓
6. Output: CLIENT_ID, CLIENT_SECRET, TENANT_ID
```

## Managing Secrets

To generate a new client secret for an existing app:

```bash
teams app auth secret create <appId>
```

To write credentials to a file:

```bash
teams app auth secret create <appId> --env .env
```

For C# projects, use `--env appsettings.json` to write credentials under a `Teams` section with PascalCase keys (`ClientId`, `ClientSecret`, `TenantId`).

The secret output always includes all three values (`CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`) so you have everything needed to configure your bot.
