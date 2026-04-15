# Bot Infrastructure Creation Guide

This guide walks through setting up the infrastructure for a Microsoft Teams bot: Teams-managed bot, AAD app creation, credentials, and Teams app manifest. **Note:** This creates a Teams-managed bot, not an Azure Bot Service registration. For SSO, you'll need to migrate to Azure-managed later. This creates the bot identity and authentication, but not the bot application code itself (see the [Bot Application Development guide](guide-create-bot-app.md) for that).

## 1. Prerequisites Verification

Before creating a Teams bot, verify these prerequisites:

### Step 1: Check Teams CLI Installation

Verify the Teams CLI is installed:

```bash
teams --version
```

**Expected output:** Shows version number (e.g., `1.0.0` or similar)

**If not installed:**

Install the Teams CLI using npm:

```bash
npm install -g @microsoft/teams.cli
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

### Step 3: Verify Bot Endpoint Availability (Optional)

Ask the user: **"Do you have a bot messaging endpoint URL, or will this bot only send proactive messages?"**

**If using proactive flows only (no endpoint needed):**
- Proactive flows = bot sends messages to Teams without first receiving a message from users
- Examples: Notifications, scheduled updates, alerts from external systems
- ⚠️ **Warning:** Without an endpoint, your bot **cannot receive messages from Teams users**. It can only send proactive messages programmatically.
- 💡 **Note:** You can always add an endpoint later using `teams app update <teamsAppId> --endpoint <url>` (see Common Operations in main skill)
- **Skip to Section 2** — no endpoint required for creation

**If the bot needs to receive messages (endpoint required):**
- Confirm the endpoint format: `https://your-domain/api/messages`
- Common formats:
  - Devtunnels: `https://your-tunnel.devtunnels.ms/api/messages`
  - ngrok: `https://your-ngrok-id.ngrok.io/api/messages`
- Default port for Teams SDK samples: `3978`

**If NO endpoint yet:**
- Recommend **Microsoft devtunnels** (recommended, Microsoft product)
- Link: https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows
- Alternative: ngrok
- **Out of scope:** Setting up the tunnel itself (point user to docs)
- User should set up tunnel first, then return to this workflow

**Checkpoint:** Either endpoint URL is ready OR confirmed proactive-only use case.

---

## 2. Create Teams-Managed Bot

Now create the Teams-managed bot with infrastructure.

### Step 1: Run Creation Command

Execute the following command (replace placeholders):

**With endpoint (bot receives messages):**
```bash
teams app create --name "YourBotName" --endpoint "https://your-endpoint/api/messages" --json
```

**Without endpoint (proactive flows only):**
```bash
teams app create --name "YourBotName" --json
```

**Parameters:**
- `--name`: Your bot's display name (e.g., "Notification Bot", "MyBot")
- `--endpoint`: **[OPTIONAL]** The bot messaging endpoint URL. Omit this for proactive-only bots.
- `--json`: Output structured JSON (required for parsing)

**Expected:** Command completes successfully and returns JSON output.

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

**Note:** If no endpoint was provided, `endpoint` will be `null`. This is normal for proactive-only bots.

### Step 3: Save Credentials to .env File

Ask the user: **"Do you already have a .env file for this project?"**

**If YES:**
- Prompt: "What is the path to your .env file?"
- Default suggestion: `.env` (current directory)
- Example paths: `.env`, `./bot/.env`, `../config/.env`

**If NO:**
- Prompt: "Where should I create the .env file?"
- Default: `.env` (current directory)
- Inform: "I'll create a new .env file at this location"

**After getting the path:**

Write the credentials to the .env file using the values from JSON output:

```
CLIENT_ID=<value-from-json>
CLIENT_SECRET=<value-from-json>
TENANT_ID=<value-from-json>
```

**Instruct the user:**

"Credentials saved to [path]. Your bot application code will use these values to authenticate with Microsoft Teams."

**Important:** If the .env file already exists, replace any existing `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` entries in place with the new values. Append only the keys that are missing. Do not create duplicate entries for these keys, and do not overwrite any other existing values in the file.

### Step 4: Display Install Link

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

- To set up SSO authentication for your bot, see the [SSO Setup guide](guide-sso-setup.md)
- To update the bot endpoint or perform other operations, see Common Operations in the main skill
- For troubleshooting, see the [Troubleshooting guide](troubleshooting.md)
