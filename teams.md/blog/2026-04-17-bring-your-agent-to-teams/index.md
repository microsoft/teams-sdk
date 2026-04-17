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

You've already built the agent. It lives somewhere: a LangChain chain, an Azure Foundry deployment, a Slack bot, a Next.js app. Your users live in Teams. This post shows you how to close that gap in under 50 lines.

It comes down to one pattern in the Teams TypeScript SDK: the **HTTP server adapter**. You plug it into your existing Express app, it registers a `POST /api/messages` route by default, and your existing server keeps running as-is. Nothing about your agent changes.

The SDK also handles the parts you don't want to think about: it verifies every incoming request is legitimately from Teams before invoking your handler, and routes messages to the right event handlers automatically.

<!-- truncate -->

## The Pattern

Every example in this post uses the same three-step shape:

```typescript
import { App, ExpressAdapter } from '@microsoft/teams.apps';

const adapter = new ExpressAdapter(expressApp);   // 1. wrap your server
const teamsApp = new App({ httpServerAdapter: adapter });  // 2. create the app

teamsApp.on('message', async ({ send, activity }) => {  // 3. handle messages
  await send(/* your agent's response */);
});

await teamsApp.initialize();   // registers POST /api/messages on your server
```

The SDK injects a `POST /api/messages` route into your existing Express app. Your server stays yours. The Teams SDK just adds one endpoint.

:::tip Python SDK
A Python SDK is also available. The same adapter pattern applies with FastAPI and other ASGI frameworks. See [Self-Managing Your Server](/python/in-depth-guides/server/http-server) in the Python docs.
:::

---

## Scenario 1: Slack Bot

You have a Slack bot built with Bolt. Your team uses both Slack and Teams. Rather than maintaining two codebases, run both on the same Express server.

`ExpressReceiver` lets Bolt mount onto your Express app instead of owning the server. The Teams SDK does the same thing. One process, two platforms.

**`teams-app.ts`:**

```typescript
import express from 'express';
import { App as BoltApp, ExpressReceiver } from '@slack/bolt';
import { App, ExpressAdapter } from '@microsoft/teams.apps';

const expressApp = express();

// Slack mounts at /slack/events
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

// Teams mounts at /api/messages
const adapter = new ExpressAdapter(expressApp);
const teamsApp = new App({ httpServerAdapter: adapter });

teamsApp.on('message', async ({ send, activity }) => {
  await send(`Hey ${activity.from.name}! You said: "${activity.text}"`);
});

export { expressApp, teamsApp };
```

One process, two platforms. Slack hits `/slack/events`, Teams hits `/api/messages`. Any shared agent logic (LLM calls, database lookups, business rules) lives in plain functions that both handlers call.

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
import { App, ExpressAdapter } from '@microsoft/teams.apps';
import { getChain } from './chain';

const expressApp = express();
const adapter = new ExpressAdapter(expressApp);
const teamsApp = new App({ httpServerAdapter: adapter });

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
import { App, ExpressAdapter } from '@microsoft/teams.apps';
import { askFoundryAgent } from './foundry-agent';

const expressApp = express();
const adapter = new ExpressAdapter(expressApp);
const teamsApp = new App({ httpServerAdapter: adapter });

teamsApp.on('message', async ({ send, activity }) => {
  // pass the Teams message to Foundry
  const reply = await askFoundryAgent(activity.text ?? '');
  await send(reply);
});

export { expressApp, teamsApp };
```

---

## Scenario 4: Next.js App

You have a Next.js app and want a Teams bot alongside it (same deployment, same codebase). The App Router owns routing, so `ExpressAdapter` won't work. Instead, implement the `IHttpServerAdapter` interface to dispatch into a handler map that the Teams SDK populates.

The adapter is ~10 lines: `registerRoute` stores the SDK's handler references when the app initializes; `dispatch` pulls the body and headers from the incoming request, looks up the right handler, and returns the response. That's the entire contract.

<details>
<summary><code>lib/nextjs-adapter.ts</code></summary>

```typescript
import type { HttpMethod, IHttpServerAdapter, IHttpServerResponse, HttpRouteHandler } from '@microsoft/teams.apps';

export class NextjsAdapter implements IHttpServerAdapter {
  private handlers = new Map<string, HttpRouteHandler>();

  registerRoute(method: HttpMethod, path: string, handler: HttpRouteHandler): void {
    this.handlers.set(`${method.toUpperCase()}:${path}`, handler);
  }

  async dispatch(method: string, path: string, body: unknown, headers: Record<string, string>): Promise<IHttpServerResponse> {
    const handler = this.handlers.get(`${method.toUpperCase()}:${path}`);
    if (!handler) return { status: 404, body: { error: 'Not found' } };
    return handler({ body, headers });
  }
}
```

</details>

**`lib/teams-app.ts`:**

```typescript
import 'server-only';
import { App } from '@microsoft/teams.apps';
import { NextjsAdapter } from './nextjs-adapter';

const adapter = new NextjsAdapter();
const teamsApp = new App({ httpServerAdapter: adapter });

teamsApp.on('message', async ({ send, activity }) => {
  await send(`Hello from Next.js! You said: "${activity.text}"`);
});

let initialized = false;

export async function getAdapter(): Promise<NextjsAdapter> {
  if (!initialized) {
    await teamsApp.initialize();
    initialized = true;
  }
  return adapter;
}
```

<details>
<summary><code>app/api/messages/route.ts</code></summary>

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/teams-app';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const adapter = await getAdapter();
  const body = await req.json();

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  const result = await adapter.dispatch('POST', '/api/messages', body, headers);
  const safeBody = result.body instanceof Error
    ? { error: result.body.message }
    : result.body;

  return NextResponse.json(safeBody, { status: result.status });
}
```

</details>

The Teams SDK doesn't care what's underneath. It just needs something that implements `registerRoute` and handles dispatch.

---

## Registering Your Bot

All four scenarios share the same registration step. First, get a public URL for your local server. [Dev tunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/overview) is the recommended option, or [ngrok](https://ngrok.com) works too.

Then use the Teams SDK CLI to register your bot and write the credentials directly to your `.env`:

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams app create --name "My Bot" --endpoint https://your-tunnel-url/api/messages --env .env
```

One command handles AAD app registration, client secret generation, manifest creation, and bot setup. Your `.env` will be populated with `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` automatically.

---

## The same three lines, every time

Regardless of which scenario fits your stack, the Teams integration is always:

```typescript
const adapter = new ExpressAdapter(expressApp);
const teamsApp = new App({ httpServerAdapter: adapter });
teamsApp.on('message', async ({ send, activity }) => { /* your agent */ });
```

Nothing about your agent or server changes. You add one listener and Teams users can reach it. The full SDK docs are at [microsoft.github.io/teams-sdk](https://microsoft.github.io/teams-sdk).
