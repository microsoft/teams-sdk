# Quickstart

Create your first Teams bot app from scratch in under 5 minutes.

## 1. Log in

```bash
teams login
```

Follow the device code flow — open the URL, enter the code, sign in with your M365 account.

## 2. Create an app

**Interactive mode** — just run:

```bash
teams app create
```

The CLI will prompt you for a name and handle everything else: AAD app registration, manifest generation, Teams app import, and bot registration.

**Scripted mode** — pass all values as flags:

```bash
teams app create --name "My Bot" --endpoint https://mybot.azurewebsites.net/api/messages
```

This creates a Teams-managed bot (no Azure subscription needed). To use Azure instead:

```bash
teams app create --name "My Bot" --azure --resource-group my-rg --endpoint https://mybot.azurewebsites.net/api/messages
```

## 3. Get your credentials

After creation, teams outputs:

```
CLIENT_ID=<your-app-client-id>
CLIENT_SECRET=<your-client-secret>
TENANT_ID=<your-tenant-id>
```

Save these to a credentials file automatically:

```bash
teams app create --name "My Bot" --env .env
```

For C# projects, use `--env appsettings.json` to write credentials under a `Teams` section with PascalCase keys.

## 4. View your app

List all your apps:

```bash
teams app list
```

View details of a specific app:

```bash
teams app get <appId>
```

## 5. Interactive mode

Just run `teams app` with no subcommand to enter the interactive menu. From there you can browse your apps, edit properties, manage manifests, and more.

```bash
teams app
```

## Next Steps

- [Update your app's properties](../commands/app/update) — name, endpoint, version
- [Download the manifest](../commands/app/manifest-download) to customize it locally
- [Set up SSO](../guides/user-authentication-setup) using the teams-dev skill or manual guide
- [Understand bot locations](../concepts/bot-locations) — Teams-managed vs Azure
