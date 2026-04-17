# Bot Application Development Guide

This guide walks through creating a new Microsoft Teams bot application using the `teams project new` command. This scaffolds the actual bot code (TypeScript, C#, or Python) that handles messages and interactions.

**Note:** This guide covers bot application code. For bot infrastructure setup (registration, credentials, AAD app), see the [Bot Infrastructure Setup guide](guide-create-bot-infra.md).

---

## Prerequisites

### Step 1: Verify Teams CLI Installation

```bash
teams --version
```

**Expected:** Version number displayed (e.g., `2.1.0-preview.3` or similar)

**If not installed:** See [Bot Infrastructure Setup guide](guide-create-bot-infra.md) for installation instructions.

### Step 2: (Optional) Set Up Bot Infrastructure First

You can create the bot application code before or after setting up infrastructure. However, to connect your bot code to Teams, you'll eventually need:

- **CLIENT_ID** - Bot's Azure AD application ID
- **CLIENT_SECRET** - Bot's authentication secret
- **TENANT_ID** - Your Microsoft 365 tenant ID

**If you haven't created infrastructure yet:**
- You can scaffold the bot code now and add credentials later
- See [Bot Infrastructure Setup guide](guide-create-bot-infra.md) when ready to create bot registration

**If you already have infrastructure:**
- Have your `.env` file or credentials ready from [Bot Infrastructure Setup guide](guide-create-bot-infra.md)
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

If you already ran [Bot Infrastructure Setup guide](guide-create-bot-infra.md) and have `CLIENT_ID` and `CLIENT_SECRET`:

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

If you created the project without `--client-id` / `--client-secret`, add the credentials from [Bot Infrastructure Setup](guide-create-bot-infra.md) to a `.env` file in the project root:

```
CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=your-secret-value
TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Step 5: Understand the Project Structure

After creation, your project will have this structure (TypeScript example):

```
MyBot/
├── src/
│   └── index.ts          # Entry point — app setup + message handlers
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── tsup.config.js        # Build config
```

The entry point (`src/index.ts`) contains the app setup and inline message handlers. There is no separate bot file — all bot logic lives in the entry point. The `.env` file is added in Step 4 (not scaffolded by default).

**Language-specific differences:**
- **C#:** `Program.cs` as entry point, `.csproj` for dependencies
- **Python:** `src/main.py` as entry point, `pyproject.toml` for dependencies

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
npm run dev
```

**C#:**
```bash
dotnet run
```

**Python:**
```bash
python src/main.py
```

> **Note:** `npm run dev` uses `tsx watch` with hot reload. Use `npm run build && npm start` for production.

**Expected Output:**
```
Bot is listening on port 3978
Bot endpoint: http://localhost:3978/api/messages
```

### Set Up Local Tunnel (for Testing in Teams)

Your bot needs to be accessible from the internet for Teams to send messages to it.

**For tunnel setup instructions**, see the [Bot Infrastructure Setup guide - Step 3: Set Up Bot Endpoint](guide-create-bot-infra.md#step-3-set-up-bot-endpoint). This covers:
- Creating a persistent devtunnel (recommended)
- Alternative options (ngrok, existing endpoints)
- Proper configuration (port 3978, protocol auto, anonymous access)

**Update your bot endpoint** (if you already created infrastructure):
```bash
teams app update <teamsAppId> --endpoint "https://<tunnel-id>.devtunnels.ms/api/messages"
```

---

## Step 7: Test Your Bot

### Install in Teams

If you completed [Bot Infrastructure Setup guide](guide-create-bot-infra.md), you have an install link.

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

The scaffolded project's entry point (`src/index.ts` for TypeScript, `app.py` for Python) contains inline message handlers. Customize your bot by editing these handlers directly.

For code patterns, API reference, and advanced features (adaptive cards, AI integration, dialogs, proactive messaging, etc.), refer to the SDK docs:
- TypeScript: https://microsoft.github.io/teams-sdk/llms_docs/docs_typescript/in-depth-guides.txt
- Python: https://microsoft.github.io/teams-sdk/llms_docs/docs_python/in-depth-guides.txt
- C#: https://microsoft.github.io/teams-sdk/llms_docs/docs_csharp/in-depth-guides.txt

**Important:** This SDK is NOT Bot Framework. Do not use `TurnContext`, `context.sendActivity()`, or other Bot Framework patterns. The SDK uses its own event-driven API — see the docs above for correct patterns.

---

## Next Steps

- **SSO:** See the [SSO Setup guide](guide-setup-sso.md) to enable silent authentication
- **Advanced features:** See the in-depth guides linked in Step 8 above
- **Troubleshooting:** See the [Troubleshooting guide](troubleshooting.md)
