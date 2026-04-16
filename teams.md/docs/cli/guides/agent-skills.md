# Agent Skills

The `teams-dev` skill is the go-to agent skill for Teams bot development. It lets AI coding assistants (Claude Code, Cursor, GitHub Copilot, and others) use the Teams CLI to manage your bot infrastructure. Instead of running CLI commands manually, you describe what you want and your AI assistant handles the rest.

## Install the `teams-dev` skill

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="claude" label="Claude Code">

Add the marketplace (first time only):
```
/plugin marketplace add microsoft/teams-sdk
```

Install the skill:
```
/plugin install teams-dev@teams-sdk
```

</TabItem>
<TabItem value="copilot" label="GitHub Copilot CLI">

Add the marketplace (first time only):
```
/plugin marketplace add microsoft/teams-sdk
```

Install the skill:
```
/plugin install teams-dev@teams-sdk
```

</TabItem>
<TabItem value="cursor" label="Cursor">

Add the marketplace (first time only):
```
/plugin marketplace add microsoft/teams-sdk
```

Install the skill:
```
/plugin install teams-dev@teams-sdk
```

</TabItem>
</Tabs>

## What the skill covers

The `teams-dev` skill guides your AI assistant through:

| Task | What it does |
|---|---|
| **Manage bot infrastructure** | Register your bot with Teams, manage credentials, and update configuration |
| **Develop Teams bot** | Build bot applications from scratch or add Teams capabilities to existing servers |
| **Set up SSO** | Enable Single Sign-On so users can authenticate seamlessly without login prompts |
| **Troubleshoot** | Diagnose and resolve common bot setup and configuration issues |

The skill does **not** cover hosting or deployment — it focuses on bot registration, development, and configuration.

## Invoke the skill

**Using natural language** (all agents including Claude Code):
- "I need a chatbot for my team's standup meetings"
- "Help me build a bot that can answer FAQs"
- "My bot won't load in Teams, can you help?"
- "Add SSO to my existing bot"

The skill loads automatically when your agent detects a relevant request.

**Claude Code shortcut:**
```
/teams-dev
```

## Example session

```
You: Help me create a Teams bot that echoes what I'm saying back to me

Agent: I'll create an echo bot for you.

       [checks teams CLI installation and authentication]
       [creates development tunnel: https://abc123.ngrok.io]
       [runs teams app create with endpoint]
       ✓ Bot registered, credentials saved to .env

       [runs teams project new typescript echo-bot -t echo]
       ✓ Bot code created in ./echo-bot

       [installs dependencies and starts bot server]
       ✓ Bot running at http://localhost:3978

       Your bot is ready! Install it in Teams:
       https://teams.microsoft.com/l/app/[app-id]
```

## Requirements

- Teams CLI installed (`npm install -g @microsoft/teams.cli`)
- Node.js 20 or later
- Microsoft 365 account with sideloading enabled

## Resources

- [Agent Skills standard](https://agentskills.io/what-are-skills) — how skills work across different AI coding assistants
