# Bot Application Development Guide

This guide walks through creating a new Microsoft Teams bot application using the `teams project new` command. This scaffolds the actual bot code (TypeScript, C#, or Python) that handles messages and interactions.

**Note:** This guide covers bot application code. For bot infrastructure setup (registration, credentials, AAD app), see the [Bot Infrastructure Setup guide](guide-bot-infra-creation.md).

---

## Prerequisites

### Step 1: Verify Teams CLI Installation

```bash
teams --version
```

**Expected:** Version number displayed (e.g., `1.0.0` or similar)

**If not installed:** See [Bot Infrastructure Setup guide](guide-bot-infra-creation.md) for installation instructions.

### Step 2: (Optional) Set Up Bot Infrastructure First

You can create the bot application code before or after setting up infrastructure. However, to connect your bot code to Teams, you'll eventually need:

- **CLIENT_ID** - Bot's Azure AD application ID
- **CLIENT_SECRET** - Bot's authentication secret
- **TENANT_ID** - Your Microsoft 365 tenant ID

**If you haven't created infrastructure yet:**
- You can scaffold the bot code now and add credentials later
- See [Bot Infrastructure Setup guide](guide-bot-infra-creation.md) when ready to create bot registration

**If you already have infrastructure:**
- Have your `.env` file or credentials ready from [Bot Infrastructure Setup guide](guide-bot-infra-creation.md)
- You'll connect them in Step 4 below

---

## Step 1: Choose Your Language

The `teams project new` command supports three languages:

**TypeScript (Recommended for Node.js developers):**
```bash
teams project new typescript <name>
# or short form:
teams project new ts <name>
```

**C# (Recommended for .NET developers):**
```bash
teams project new csharp <name>
# or short form:
teams project new cs <name>
```

**Python (Recommended for Python developers):**
```bash
teams project new python <name>
# or short form:
teams project new py <name>
```

---

## Step 2: Choose a Template

All languages support the same template options via `-t, --template <template>`:

**Available Templates:**

| Template | Description | Use Case |
|----------|-------------|----------|
| `echo` | Simple echo bot (default) | Learning, testing, basic message handling |
| `ai` | AI-powered bot with LLM integration | Intelligent responses, chat completion, AI features |
| `graph` | Microsoft Graph integration | Access user data, calendar, mail, SharePoint |
| `mcp` | Model Context Protocol server | Advanced AI scenarios, custom context handling |
| `mcpclient` | MCP client integration | Connect to MCP servers |
| `tab` | Teams tab application | UI-based apps, embedded web content |

**Note:** Template availability varies by language. Check `teams project new <language> --help` for the actual list of available templates for each language.

**Recommendations:**
- **First bot?** Start with `echo` to learn the basics
- **AI features?** Use `ai` for LLM-powered responses
- **Microsoft 365 data?** Use `graph` for accessing user/org data
- **UI application?** Use `tab` for web-based Teams apps

---

## Step 3: Create the Bot Project

### Option A: Create Without Infrastructure (Add Credentials Later)

**Basic creation with template:**
```bash
teams project new typescript MyBot -t ai
```

This creates the project with placeholder credentials. You'll add real credentials from your `.env` file later.

### Option B: Create With Existing Infrastructure

If you already ran [Bot Infrastructure Setup guide](guide-bot-infra-creation.md) and have `CLIENT_ID` and `CLIENT_SECRET`:

```bash
teams project new typescript MyBot \
  -t ai \
  --client-id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --client-secret "your-secret-value"
```

**Parameters:**
- `<name>` - Your bot project name (e.g., `MyBot`, `NotificationBot`)
- `-t, --template` - Template choice (ai, echo, graph, mcp, mcpclient, tab)
- `--client-id` - **[OPTIONAL]** Your bot's CLIENT_ID from infrastructure setup
- `--client-secret` - **[OPTIONAL]** Your bot's CLIENT_SECRET from infrastructure setup
- `--toolkit` - **[OPTIONAL]** M365 Agents Toolkit configuration
- `-s, --start` - **[OPTIONAL]** Auto-start the project after creation
- `--json` - **[OPTIONAL]** Output as JSON

**Expected Output:**
```
✓ Created bot project: MyBot
✓ Language: TypeScript
✓ Template: ai
✓ Dependencies installed
✓ Project ready at: ./MyBot
```

---

## Step 4: Connect to Infrastructure (If Not Done in Step 3)

If you created the project without credentials, connect it to your bot infrastructure now.

### Locate Your Credentials

From [Bot Infrastructure Setup guide](guide-bot-infra-creation.md), you should have a `.env` file with:
```
CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=your-secret-value
TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Add to Bot Project

**Navigate to your bot project:**
```bash
cd MyBot
```

**Copy or merge the credentials into the project's `.env` file:**

**If project has `.env.sample` or `.env.local`:**
- Copy your `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID` values into the appropriate file
- Follow the project's README for environment variable naming conventions

**If project doesn't have `.env` yet:**
- Copy your `.env` file from infrastructure setup: `cp ../.env .env`
- Or create `.env` manually with the credentials

**Verify:**
- Your bot project now has access to the authentication credentials
- The bot can authenticate with Microsoft Teams using these values

---

## Step 5: Understand the Project Structure

After creation, your project will have this structure (TypeScript example):

```
MyBot/
├── src/
│   ├── index.ts          # Entry point
│   ├── bot.ts            # Bot logic (message handling)
│   └── [template-specific files]
├── .env                  # Environment variables (credentials)
├── package.json          # Dependencies (Node.js)
├── tsconfig.json         # TypeScript config
└── README.md             # Project documentation
```

**Key Files:**
- **`src/bot.ts`** - Your bot's message handling logic
- **`.env`** - Credentials and configuration
- **`src/index.ts`** - Server setup and bot initialization
- **`README.md`** - Template-specific documentation

**Language-specific differences:**
- **C#:** Uses `.csproj`, `Program.cs`, `Bot.cs`
- **Python:** Uses `requirements.txt`, `app.py`, `bot.py`

---

## Step 6: Run the Bot Locally

### Install Dependencies (if not auto-installed)

**TypeScript:**
```bash
npm install
```

**C#:**
```bash
dotnet restore
```

**Python:**
```bash
pip install -r requirements.txt
```

### Start the Bot

**TypeScript:**
```bash
npm start
```

**C#:**
```bash
dotnet run
```

**Python:**
```bash
python app.py
```

**Expected Output:**
```
Bot is listening on port 3978
Bot endpoint: http://localhost:3978/api/messages
```

### Set Up Local Tunnel (for Testing in Teams)

Your bot needs to be accessible from the internet for Teams to send messages to it.

**Recommended: Microsoft devtunnels**
```bash
devtunnel create
devtunnel port create 3978
devtunnel host
```

This gives you a public URL like: `https://your-tunnel.devtunnels.ms`

**Update your bot endpoint** (if you already created infrastructure):
```bash
teams app update <teamsAppId> --endpoint "https://your-tunnel.devtunnels.ms/api/messages"
```

**Alternative:** Use ngrok (`ngrok http 3978`)

---

## Step 7: Test Your Bot

### Install in Teams

If you completed [Bot Infrastructure Setup guide](guide-bot-infra-creation.md), you have an install link.

**Get the install link:**
```bash
teams app get <teamsAppId> --json
```

Look for `installLink` in the output and open it in your browser.

### Send a Test Message

1. Open the bot in Teams (personal chat or team channel)
2. Send a message: `Hello bot!`
3. **Echo template:** Bot responds with your message
4. **AI template:** Bot responds with AI-generated content
5. **Graph template:** Bot can access your Microsoft 365 data

---

## Step 8: Customize Your Bot

### Modify Bot Logic

Edit the main bot file:
- **TypeScript:** `src/bot.ts`
- **C#:** `Bot.cs`
- **Python:** `bot.py`

**Example (TypeScript - Echo Bot):**
```typescript
// src/bot.ts
public async onMessage(context: TurnContext): Promise<void> {
  const text = context.activity.text;

  // Custom logic here
  const response = `You said: ${text}`;

  await context.sendActivity(response);
}
```

### Add Features

Depending on your template:
- **AI bots:** Modify prompts, add RAG (Retrieval-Augmented Generation)
- **Graph bots:** Add more Microsoft 365 API calls (mail, calendar, files)
- **Echo bots:** Add commands, adaptive cards, message formatting

### Restart After Changes

After modifying code:
1. Stop the bot (Ctrl+C)
2. Rebuild if needed (TypeScript: no rebuild needed with `npm start`)
3. Restart: `npm start` / `dotnet run` / `python app.py`
4. Test changes in Teams

---

## Next Steps

**Set up SSO (Single Sign-On):**
- See the [SSO Setup guide](guide-sso-setup.md) to enable silent authentication
- Users won't need to log in separately

**Add advanced features:**
- Adaptive Cards for rich UI
- Proactive messaging (send notifications without user prompt)
- Multi-turn conversations and dialog management
- Integration with external APIs and databases

**Learn more:**
- Teams SDK docs: https://microsoft.github.io/teams-sdk/welcome
- Bot Framework: https://learn.microsoft.com/en-us/azure/bot-service/
- Adaptive Cards: https://adaptivecards.io/

**Troubleshooting:**
- See the [Troubleshooting guide](troubleshooting.md) for common errors
- Check bot logs for errors
- Verify credentials in `.env` match infrastructure
