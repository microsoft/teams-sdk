---
slug: bring-your-agent-to-teams
title: "Bring Your Agent to Teams"
date: 2026-04-17
authors:
  - name: Aamir Jawaid
    title: Microsoft
    url: https://github.com/heyitsaamir
    image_url: https://github.com/heyitsaamir.png
  - name: Umang Sehgal
    title: Microsoft
    url: https://github.com/umangsehgal
    image_url: https://github.com/umangsehgal.png
tags: [teams-sdk, agents, langchain, azure-ai, byo-agent]
description: Your agent is already built. Here's how to surface it in Teams in under 50 lines, without rewriting anything.
---

You've already built the agent. It lives somewhere: a LangChain chain, an Azure Foundry deployment, a Slack bot. Your users live in Teams. Teams is where most enterprise work happens: decisions get made, customers get answered, and projects move forward there. Getting your agent into that context, before you build anything Teams-specific, is already worth doing.

It comes down to one pattern in the Teams TypeScript SDK: the **HTTP server adapter**. You point it at your HTTP server, it registers a messaging endpoint, and your existing server keeps running as-is. The scenarios below cover three different starting points: a Slack bot, a LangChain chain, and an Azure Foundry agent.

The SDK also handles the parts you don't want to think about: it verifies every incoming request is legitimately from Teams before invoking your handler, and routes messages to the right event handlers automatically.

<!-- truncate -->

:::tip Python SDK
A Python SDK is also available. The same three-step pattern applies with FastAPI and other ASGI frameworks.

<details>
<summary>Show Python equivalent</summary>

```python
from fastapi import FastAPI
from microsoft_teams.apps import App, FastAPIAdapter

fastapi_app = FastAPI()

adapter = FastAPIAdapter(app=fastapi_app)    # 1. wrap your server
teams_app = App(http_server_adapter=adapter) # 2. create the app

@teams_app.on_message
async def handle_message(ctx):               # 3. handle messages
    await ctx.send("your agent's response")

await teams_app.initialize()
```

</details>

See [Self-Managing Your Server](/python/in-depth-guides/server/http-server) for the full Python guide.
:::

## The Pattern

Every example in this post uses the same three-step shape:

```typescript
import { App as TeamsApp, ExpressAdapter } from '@microsoft/teams.apps';

const adapter = new ExpressAdapter(expressApp);   // 1. wrap your server
const teamsApp = new TeamsApp({ httpServerAdapter: adapter });  // 2. create the app

teamsApp.on('message', async ({ send, activity }) => {  // 3. handle messages
  await send(/* your agent's response */);
});

await teamsApp.initialize();   // registers POST /api/messages on your server
```

The SDK injects a `POST /api/messages` route into your existing Express app. `/api/messages` is the well-known endpoint Teams uses to deliver messages to your bot, the Teams-shaped interface your HTTP server needs to have. Your server stays yours; the Teams SDK just adds that one endpoint.

---

## Scenario 1: Slack Bot

You have a Slack bot built with Bolt (or any other kind of bot deployed as a web service). Your team uses both Slack and Teams. Rather than maintaining two codebases, run both on the same Express server.

`ExpressReceiver` lets Bolt mount onto your Express app instead of owning the server. The Teams SDK does the same thing, so both platforms share the same process.

<details>
<summary><code>slack-app.ts</code>: existing Slack logic, untouched</summary>

```typescript
import { App as BoltApp, ExpressReceiver } from '@slack/bolt';
import type { Express } from 'express';

export function mountSlack(expressApp: Express) {
  const slackReceiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    app: expressApp,
    endpoints: { events: '/slack/events' },
  });

  const slackApp = new BoltApp({
    token: process.env.SLACK_BOT_TOKEN,
    receiver: slackReceiver,
  });

  slackApp.message('hello', async ({ say }) => {
    await say('Hey! Caught you on Slack.');
  });
}
```

</details>

**`teams-app.ts`:**

```typescript
import express from 'express';
import { App as TeamsApp, ExpressAdapter } from '@microsoft/teams.apps';
import { mountSlack } from './slack-app';

const expressApp = express();
mountSlack(expressApp);

// Teams mounts at /api/messages
const adapter = new ExpressAdapter(expressApp);
const teamsApp = new TeamsApp({ httpServerAdapter: adapter });

teamsApp.on('message', async ({ send, activity }) => {
  await send(`Hey ${activity.from.name}! You said: "${activity.text}"`);
});

export { expressApp, teamsApp };
```

Both platforms run in the same process. Slack hits `/slack/events`, Teams hits `/api/messages`, and any shared agent logic (LLM calls, database lookups, business rules) lives in plain functions that both handlers call.

---

## Scenario 2: LangChain

You have a LangChain chain. You want Teams users to talk to it.

<details>
<summary><code>chain.ts</code>: existing LangChain logic, untouched</summary>

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

let _chain: ReturnType<typeof buildChain> | null = null;

function buildChain() {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant embedded in Microsoft Teams. Be concise.'],
    ['human', '{input}'],
  ]);
  return prompt.pipe(new ChatOpenAI({ model: 'gpt-4o-mini' })).pipe(new StringOutputParser());
}

export function getChain() {
  if (!_chain) _chain = buildChain();
  return _chain;
}
```

</details>

**`teams-app.ts`** (the bridge):

```typescript
import express from 'express';
import { App as TeamsApp, ExpressAdapter } from '@microsoft/teams.apps';
import { getChain } from './chain';

const expressApp = express();
const adapter = new ExpressAdapter(expressApp);
const teamsApp = new TeamsApp({ httpServerAdapter: adapter });

teamsApp.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });
  // pass the Teams message to LangChain
  const reply = await getChain().invoke({ input: activity.text ?? '' });
  await send(reply);
});

export { expressApp, teamsApp };
```

**`index.ts`** (start it):

```typescript
import 'dotenv/config';
import http from 'http';
import { expressApp, teamsApp } from './teams-app';

await teamsApp.initialize();
http.createServer(expressApp).listen(3978);
```

Your chain runs on every message. The typing indicator fires before the LLM responds so users know something's happening.

---

## Scenario 3: Azure AI Foundry

You have an agent deployed in Azure AI Foundry. The Teams SDK gives you the message; you forward it to Foundry and relay the reply.

<details>
<summary><code>foundry-agent.ts</code></summary>

```typescript
import { AIProjectClient } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';

let _client: AIProjectClient | null = null;

function getClient() {
  if (!_client) {
    _client = AIProjectClient.fromEndpoint(
      process.env.AZURE_AI_FOUNDRY_ENDPOINT!,
      new DefaultAzureCredential(),
    );
  }
  return _client;
}

export async function askFoundryAgent(userMessage: string): Promise<string> {
  const client = getClient();
  const thread = await client.agents.threads.create();
  await client.agents.messages.create(thread.id, 'user', userMessage);

  const run = await client.agents.runs.createAndPoll(
    thread.id,
    process.env.AZURE_AGENT_ID!,
  );

  if (run.status !== 'completed') throw new Error(`Run ended: ${run.status}`);

  const messages = client.agents.messages.list(thread.id);
  for await (const msg of messages) {
    if (msg.role === 'assistant') {
      return msg.content
        .filter((c): c is { type: 'text'; text: { value: string } } => c.type === 'text')
        .map((c) => c.text.value)
        .join('');
    }
  }
  return 'No response from agent.';
}
```

</details>

**`teams-app.ts`:**

```typescript
import express from 'express';
import { App as TeamsApp, ExpressAdapter } from '@microsoft/teams.apps';
import { askFoundryAgent } from './foundry-agent';

const expressApp = express();
const adapter = new ExpressAdapter(expressApp);
const teamsApp = new TeamsApp({ httpServerAdapter: adapter });

teamsApp.on('message', async ({ send, activity }) => {
  // pass the Teams message to Foundry
  const reply = await askFoundryAgent(activity.text ?? '');
  await send(reply);
});

export { expressApp, teamsApp };
```

---

## Registering Your Bot

All three scenarios share the same registration step.

**Step 1: Get a public URL for your local server.**

Teams needs to reach your bot over HTTPS. For local development, [Dev tunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/overview) is the recommended option — it's built into VS Code and the Azure CLI. [ngrok](https://ngrok.com) works too. Either way, you'll get a URL like `https://abc123.devtunnels.ms` that forwards to your local port.

**Step 2: Register your bot using the Teams SDK CLI.**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams app create --name "My Bot" --endpoint https://your-tunnel-url/api/messages --env .env
```

This handles AAD app registration, client secret generation, manifest creation, and bot setup in one command. Your `.env` gets populated with `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` automatically.

**Step 3: Sideload the app into Teams.**

After `teams app create`, follow the sideloading instructions in the CLI output to install the app in your Teams client for testing.

This setup is for local development. For production deployments, hosting, CI/CD, and app store submission, see the [deployment docs](https://microsoft.github.io/teams-sdk/typescript/in-depth-guides/deploy).

---

## The same three lines, every time

Every scenario in this post follows the same shape because the SDK is built around one idea: your server is yours. The adapter is the seam between your existing infrastructure and Teams. Whether you're running Express or any other HTTP server, the SDK doesn't care what's underneath. It just needs something that can register a route and handle a request.

```typescript
const adapter = new <YourAdapter>(yourServer); // ExpressAdapter or your own
const teamsApp = new TeamsApp({ httpServerAdapter: adapter });
teamsApp.on('message', async ({ send, activity }) => { /* your agent */ });
```

If you're already running a bot somewhere, wiring it into Teams is a few lines of glue code. Full docs at [Self-Managing Your Server](https://microsoft.github.io/teams-sdk/typescript/in-depth-guides/server/http-server/).
