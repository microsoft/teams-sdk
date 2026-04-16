---
sidebar_position: 2
title: "Quickstart: Build your first bot"
summary: Write your first Teams bot using the Teams SDK in TypeScript, C#, or Python.
---

# Quickstart: Build your first bot

This quickstart walks you through writing a bot that responds to messages in Teams using the **Teams SDK**. Pick your language and you will have a working bot in a few minutes.

:::tip Already have infrastructure?
If you haven't registered your Teams app yet, start with [Quickstart: Register your app](./quickstart-register) first, then come back here.
:::

---

## Choose your language

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="typescript" label="TypeScript" default>

**Prerequisites:** Node.js 18.x, 20.x, or 22.x

If you used the CLI to scaffold your project, your `src/index.ts` already has a working message handler. Here's what it looks like and how to extend it:

```typescript
import { App } from '@microsoft/teams.apps';

const app = new App();

app.on('message', async (ctx) => {
  await ctx.reply(`You said: ${ctx.activity.text}`);
});

app.start();
```

**What each part does:**

| Part | Purpose |
|---|---|
| `new App()` | Creates the bot, reads credentials from `.env` automatically |
| `app.on('message', ...)` | Registers a handler for incoming chat messages |
| `ctx.reply(...)` | Sends a reply back to the same conversation |
| `app.start()` | Starts the HTTP server on `process.env.PORT` (default `3978`) |

**Run it:**
```bash
npm run dev
```

Full guide: [TypeScript Getting Started](../typescript/getting-started/index.mdx)

</TabItem>
<TabItem value="csharp" label="C#">

**Prerequisites:** .NET 8.0+

```csharp
using Microsoft.Teams.Apps;

var app = new App();

app.OnMessage(async (ctx) =>
{
    await ctx.Reply($"You said: {ctx.Activity.Text}");
});

await app.StartAsync();
```

Full guide: [C# Getting Started](../csharp/getting-started/index.mdx)

</TabItem>
<TabItem value="python" label="Python">

**Prerequisites:** Python 3.8+

```python
from teams.apps import App

app = App()

@app.on('message')
async def on_message(ctx):
    await ctx.reply(f"You said: {ctx.activity.text}")

app.start()
```

Full guide: [Python Getting Started](../python/getting-started/index.mdx)

</TabItem>
</Tabs>

---

## What's next

- [Essentials](../typescript/essentials/index.mdx) — events, activities, sending messages, authentication
- [In-Depth Guides](../typescript/in-depth-guides/index.mdx) — Adaptive Cards, AI, MCP, dialogs, tabs, and more
- [Quickstart: Register your app](./quickstart-register) — set up bot infrastructure with the Teams CLI
