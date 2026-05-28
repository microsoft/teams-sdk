---
sidebar_position: 3
summary: Test your Teams agent locally with the Microsoft 365 Agents Playground CLI.
---

# 🎮 Microsoft 365 Agents Playground

The Microsoft 365 Agents Playground is a local testing tool for agents built with the Teams SDK. It lets you chat with your agent, mock activities, and inspect requests and responses without sideloading into Teams.

![Microsoft 365 Agents Playground showing the welcome page with a sidebar listing Personal Chat, Group Chat, and Teams Channels, and a 'Type a message' compose box at the bottom.](/screenshots/agents-playground-blank.png)

## Install

### Option 1: npm (recommended)

```bash
npm install -g @microsoft/m365agentsplayground
```

### Option 2: Standalone binary

```bash
winget install agentsplayground
```

For other platforms and full install options, see the [Microsoft Learn guide](https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/test-with-toolkit-project).

## Migrating from DevTools

If your agent previously used `DevtoolsPlugin` from `@microsoft/teams.dev`, remove it from your `App` configuration. The Playground is a separate CLI tool and does not need a plugin in your code.

You can also remove `@microsoft/teams.dev` from your `package.json` after deleting `DevtoolsPlugin`. The Playground is installed separately as a CLI tool, not as a project dependency.

The Playground talks to your agent in `emulator` channel mode, which sends no JWT. Your agent therefore needs to accept unauthenticated requests on `/api/messages`. There are two ways to do this.

### Recommended: run anonymously

For local development, leave `CLIENT_ID` / `CLIENT_SECRET` / `TENANT_ID` unset (for example, comment them out of your `.env`). With no credentials configured, the bot does not enforce JWT validation. The SDK logs a warning at startup confirming the bot is in anonymous mode:

```
[WARN] No credentials configured (CLIENT_ID / CLIENT_SECRET / TENANT_ID). Bot will accept unauthenticated requests on /api/messages.
```

This is the cleanest migration path: nothing to add to your code, and the startup warning makes the mode explicit.

### Alternative: `skipAuth: true`

If you need to keep credentials configured for local dev (for example, to match a production config), set `skipAuth: true` on your `App` instead:

```typescript
const app = new App({
  // ...
  skipAuth: true,  // local development only; do not enable in production
});
```

### Why this is needed

`DevtoolsPlugin` previously bypassed JWT validation implicitly because it ran in-process and never went through `/api/messages` over HTTP. The Playground sends real HTTP requests, so the bot's JWT validator fires unless one of the two options above is in effect.

## Launch

Start your agent locally (default port `3978`), then run:

```bash
agentsplayground -e http://localhost:3978/api/messages -c emulator
```

The playground opens at [http://localhost:56150](http://localhost:56150).

### Common flags

- `-e, --app-endpoint` — your agent's endpoint, e.g. `http://localhost:3978/api/messages`
- `-c, --channel-id` — `emulator`, `webchat`, `msteams`, `directline`, or `agents`
- `--client-id`, `--client-secret`, `--tenant-id` — credentials when your agent requires authentication
- `-p, --port` — port for the playground UI (default `56150`)

Run `agentsplayground --help` for the full list.

## Test your agent

Type a message in the compose box and send it. Your agent's reply renders inline.

![Microsoft 365 Agents Playground showing a user message 'hello!' and an agent reply 'you said \"hello!\"'.](/screenshots/agents-playground-echo-chat.png)

Use the **Mock an Activity** menu to send custom activity types (membership changes, invokes, message reactions, and more). Use the **Debug Options** menu to control delivery mode and logging. The **Log Panel** (toggle from the top right) shows the HTTP exchange between the playground and your agent.

## Learn more

- [Test your agent locally in Microsoft 365 Agents Playground](https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/test-with-toolkit-project) — full Microsoft Learn guide
- [Microsoft 365 Agents SDK](https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/)
