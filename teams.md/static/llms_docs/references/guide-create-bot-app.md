# Bot Application Development Guide

This guide walks through creating a new Microsoft Teams bot application using the `teams project new` command. This scaffolds the actual bot code (TypeScript, Python, or C#) that handles messages and interactions.

**Note:** This guide covers bot application code. For bot infrastructure setup (registration, credentials, AAD app), see the [Bot Infrastructure Setup guide](https://microsoft.github.io/teams-sdk/llms_docs/references/guide-create-bot-infra.md).

## How Teams Bots Work

A Teams bot is a web application that receives messages from Teams via webhooks. When a user messages your bot, Teams sends an HTTP POST to your application's endpoint. Your app processes the message and responds.

Three things need to exist:
1. **Your web application** — runs locally or deployed, listening for HTTP requests
2. **A bot registration** — an app identity in Azure with a client ID/secret, pointing to your application's URL
3. **A public HTTPS endpoint** — so Teams can reach your app (use a dev tunnel for local development)

The Teams SDK handles the webhook plumbing, authentication, and message parsing — you just write handlers for the messages you care about.

---

## Prerequisites

### Step 1: Verify Teams CLI Installation

```bash
teams --version
```

**Expected:** Version number displayed (e.g., `2.1.0-preview.3` or similar)

**If not installed:** See [Bot Infrastructure Setup guide](https://microsoft.github.io/teams-sdk/llms_docs/references/guide-create-bot-infra.md) for installation instructions.

### Step 2: Set Up Bot Infrastructure

Before creating bot code, set up your bot registration and credentials by following the **[Bot Infrastructure Setup guide](https://microsoft.github.io/teams-sdk/llms_docs/references/guide-create-bot-infra.md)**. You'll need:

- **CLIENT_ID** - Bot's Azure AD application ID
- **CLIENT_SECRET** - Bot's authentication secret
- **TENANT_ID** - Your Microsoft 365 tenant ID

Have your credentials ready before proceeding (`.env` for TypeScript/Python, `appsettings.json` for C#).

---

## Step 1: Choose Your Language

The `teams project new` command supports three languages:

**TypeScript:**
```bash
teams project new ts <name>
```

**Python:**
```bash
teams project new py <name>
```

**C#:**
```bash
teams project new cs <name>
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

**Note:** Template availability varies by language. Check `teams project new <language> --help` for the actual list of available templates for each language.

**Recommendations:**
- **First bot?** Start with `echo` to learn the basics
- **AI features?** Use `ai` for LLM-powered responses
- **Microsoft 365 data?** Use `graph` for accessing user/org data

---

## Step 3: Create the Bot Project

```bash
teams project new typescript MyBot -t echo
```

Copy credentials from the [Bot Infrastructure Setup guide](https://microsoft.github.io/teams-sdk/llms_docs/references/guide-create-bot-infra.md) into the project:
- **TypeScript / Python:** Copy the `.env` file into the project root
- **C#:** Add a `Teams` section to `appsettings.json` with `ClientId`, `ClientSecret`, and `TenantId` (the `--env appsettings.json` flag does this automatically during infrastructure setup)

---

## Step 4: Run the Bot Locally

Follow the instructions printed by `teams project new` to install dependencies and start the bot.

### Set Up Local Tunnel (for Testing in Teams)

Your bot needs to be accessible from the internet for Teams to send messages to it.

**For tunnel setup instructions**, see the [Bot Infrastructure Setup guide - Step 3: Set Up Bot Endpoint](https://microsoft.github.io/teams-sdk/llms_docs/references/guide-create-bot-infra.md#step-3-set-up-bot-endpoint). This covers:
- Creating a persistent devtunnel (recommended)
- Alternative options (ngrok, existing endpoints)
- Proper configuration (port 3978, protocol auto, anonymous access)

**Update your bot endpoint** (if you already created infrastructure):
```bash
teams app update <teamsAppId> --endpoint "https://<tunnel-id>.devtunnels.ms/api/messages"
```

---

## Step 5: Test Your Bot

### Install in Teams

If you completed [Bot Infrastructure Setup guide](https://microsoft.github.io/teams-sdk/llms_docs/references/guide-create-bot-infra.md), you have an install link.

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

## Step 6: Customize Your Bot

The scaffolded project's entry point (`src/index.ts` for TypeScript, `src/main.py` for Python) contains inline message handlers. Customize your bot by editing these handlers directly.

For code patterns, API reference, and advanced features (adaptive cards, AI integration, dialogs, proactive messaging, etc.), refer to the SDK docs:
- TypeScript: https://microsoft.github.io/teams-sdk/llms_docs/llms_typescript.txt
- Python: https://microsoft.github.io/teams-sdk/llms_docs/llms_python.txt
- C#: https://microsoft.github.io/teams-sdk/llms_docs/llms_csharp.txt

**Important:** This SDK is NOT Bot Framework. Do not use `TurnContext`, `context.sendActivity()`, or other Bot Framework patterns. The SDK uses its own event-driven API — see the docs above for correct patterns.

**Tip:** Use compile-time checks to catch mistakes early — both SDKs are strongly typed. For TypeScript, run `tsc --noEmit` to type-check without emitting files. For Python, run `pyright` or a similar type checker. The compiler will flag incorrect API usage before you even run the bot.

---

## Next Steps

- **SSO:** See the [SSO Setup guide](https://microsoft.github.io/teams-sdk/llms_docs/references/guide-setup-sso.md) to enable silent authentication
- **Advanced features:** See the in-depth guides linked in Step 6 above
- **Troubleshooting:** See the [Troubleshooting guide](https://microsoft.github.io/teams-sdk/llms_docs/references/troubleshooting.md)
