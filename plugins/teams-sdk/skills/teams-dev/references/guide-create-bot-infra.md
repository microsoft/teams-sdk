# Bot Infrastructure Creation Guide

This guide walks through setting up the infrastructure for a Microsoft Teams bot: Teams-managed bot, AAD app creation, credentials, and Teams app manifest. **Note:** This creates a Teams-managed bot, not an Azure Bot Service registration. For SSO, you'll need to migrate to Azure-managed later. This creates the bot identity and authentication, but not the bot application code itself (see the [Bot Application Development guide](guide-create-bot-app.md) for that).

**Tip:** Run `teams --help --json` to get the full CLI command tree and discover all available options.

## 1. Prerequisites Verification

Before creating a Teams bot, verify these prerequisites:

### Step 1: Check Teams CLI Installation

Verify the Teams CLI is installed:

```bash
teams --version
```

**Expected output:** Shows version number (e.g., `2.1.0-preview.3` or similar)

**If not installed:**

Install the Teams CLI using npm:

```bash
npm install -g @microsoft/teams.cli@preview
```

**After installation:**
- Verify: Run `teams --version` to confirm installation
- You should see the version number

**Checkpoint:** Teams CLI is installed.

### Step 2: Check Authentication

Run the following command to check authentication status:

```bash
teams status
```

**Expected output:** Shows authenticated user information.

**If not authenticated:**
1. Run: `teams login`
2. Follow the authentication flow
3. Verify: Run `teams status` again and confirm you see your authenticated account

**Checkpoint:** Authentication verified before proceeding.

### Step 3: Set Up Bot Endpoint

Your bot needs a publicly accessible HTTPS endpoint for Teams to send messages to it.

**Expected format:** `https://your-domain/api/messages`

#### Option A: Use Existing Endpoint

If you already have a deployed bot or public URL, use that endpoint and proceed to the next section.

#### Option B: Set Up Development Tunnel (Persistent)

For local development, create a **persistent tunnel** that keeps the same URL across sessions.

**Install devtunnels (if not already installed):**

See the official guide: https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows

**Create a persistent tunnel (one-time setup):**

```bash
devtunnel create my-teams-bot --allow-anonymous
devtunnel port create my-teams-bot -p 3978 --protocol auto
```

Replace `my-teams-bot` with your preferred tunnel name.

**Important:** Port `3978` is the default Teams SDK port. Protocol `auto` allows both HTTP and HTTPS. The `--allow-anonymous` flag allows Teams to connect without authentication.

**Expected output:**
```
Created tunnel: my-teams-bot (<tunnel-id>)
Hosting port: 3978
Tunnel URL: https://<tunnel-id>.devtunnels.ms
```

**Start the tunnel (each development session):**

```bash
devtunnel host my-teams-bot
```

Your persistent tunnel URL remains: `https://<tunnel-id>.devtunnels.ms`

**Format your endpoint URL:**
```
https://<tunnel-id>.devtunnels.ms/api/messages
```

**Alternative:** Use ngrok or Cloudflare tunnel if you prefer.

**Note:** With a persistent tunnel, your URL stays the same across sessions - you only need to run `devtunnel host my-teams-bot` to start it each time.

**Checkpoint:** Endpoint URL is ready (either existing or persistent tunnel-based).

---

## 2. Create Teams-Managed Bot

Now create the Teams-managed bot with infrastructure.

### Step 1: Run Creation Command

Execute the following command (replace placeholders):

```bash
teams app create --name "YourBotName" --endpoint "https://your-endpoint/api/messages" --env .env --json
```

**Expected:** Command completes successfully, writes credentials to `.env`, and returns JSON output.

### Step 2: Parse JSON Output

The command returns JSON with these fields:

```json
{
  "appName": "YourBotName",
  "teamsAppId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "botId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "endpoint": "https://your-endpoint/api/messages",
  "installLink": "https://teams.microsoft.com/l/app/...",
  "botLocation": "teams-managed",
  "credentials": {
    "CLIENT_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "CLIENT_SECRET": "your-secret-value",
    "TENANT_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

### Step 3: Display Install Link

Show the install link from the JSON output:

```
Install your bot in Teams:
<install-link-from-json>
```

**Instruct the user:**

"Open this link in your browser to install the bot in Microsoft Teams. You can install it for personal use, in a team, or in a group chat."

**Do NOT automatically open the browser** - let the user decide when to install.

**Checkpoint:** Bot created successfully, credentials and install link displayed.

---

## 3. Verification

Verify the bot was created successfully.

### Step 1: Verify App Exists

Run the following command (use the `teamsAppId` from creation output):

```bash
teams app get <teamsAppId> --json
```

**Expected output:** Returns app details matching what was created:
- `teamsAppId` matches
- `botId` matches
- `endpoint` matches (or is empty if not configured)
- App shows as active

**If verification fails:** Check the error message and refer to the [Troubleshooting guide](troubleshooting.md).

**Checkpoint:** App verified in Teams Developer Portal.

---

## Next Steps

- To set up SSO authentication for your bot, see the [SSO Setup guide](guide-setup-sso.md)
- To update the bot endpoint or perform other operations, see Common Operations in the main skill
- For troubleshooting, see the [Troubleshooting guide](troubleshooting.md)
