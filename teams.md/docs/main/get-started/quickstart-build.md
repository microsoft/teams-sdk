---
sidebar_position: 2
title: "Quickstart: Build your first bot"
summary: Wire up a message handler in TypeScript, C#, or Python with the Teams SDK.
---

# Quickstart: Build your first bot

Write a bot that responds to messages in Teams using the Teams SDK. Pick your language below.

:::tip
If you haven't registered your Teams app yet, start with [Quickstart: Register your app](./quickstart-register) — you'll need the credentials before this code can talk to Teams.
:::

## Pick your language

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="language">
<TabItem value="typescript" label="TypeScript" default>

If you scaffolded with `teams project new typescript`, your `src/index.ts` already looks like this:

```typescript
import { App } from '@microsoft/teams.apps';

const app = new App();

app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });
  await send(`you said "${activity.text}"`);
});

app.start(process.env.PORT || 3978).catch(console.error);
```

| Part | Purpose |
|---|---|
| `new App()` | Reads credentials from `.env` automatically |
| `app.on('message', ...)` | Registers a handler for incoming messages |
| `send({ type: 'typing' })` | Shows the typing indicator while you build a reply |
| `send(...)` | Replies in the same conversation |
| `app.start(port)` | Starts the HTTP server on the given port |

Run it:

```bash
npm run dev
```

Continue with the [TypeScript guide](/typescript/getting-started) for events, sending messages, Adaptive Cards, AI, and more.

</TabItem>
<TabItem value="csharp" label="C#">

If you scaffolded with `teams project new csharp`, your `Program.cs` already looks like this:

```csharp
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Extensions;
using Microsoft.Teams.Plugins.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.AddTeams();
var app = builder.Build();
var teams = app.UseTeams();

teams.OnMessage(async (context, cancellationToken) =>
{
    await context.Typing(cancellationToken);
    await context.Send($"you said '{context.Activity.Text}'", cancellationToken);
});

app.Run();
```

Run it:

```bash
dotnet run
```

Continue with the [C# guide](/csharp/getting-started) for events, sending messages, Adaptive Cards, AI, and more.

</TabItem>
<TabItem value="python" label="Python">

If you scaffolded with `teams project new python`, your `src/main.py` already looks like this:

```python
import asyncio

from microsoft_teams.api import MessageActivity, TypingActivityInput
from microsoft_teams.apps import ActivityContext, App

app = App()


@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    await ctx.reply(TypingActivityInput())
    await ctx.send(f"You said '{ctx.activity.text}'")


def main():
    asyncio.run(app.start())


if __name__ == "__main__":
    main()
```

Run it:

```bash
pip install -e .
python src/main.py
```

Continue with the [Python guide](/python/getting-started) for events, sending messages, Adaptive Cards, AI, and more.

</TabItem>
</Tabs>

## What's next

- **Essentials** — events, activities, sending messages, authentication: [TypeScript](/typescript/essentials) · [C#](/csharp/essentials) · [Python](/python/essentials)
- **In-depth guides** — Adaptive Cards, AI, MCP, dialogs, tabs, and more: [TypeScript](/typescript/in-depth-guides) · [C#](/csharp/in-depth-guides) · [Python](/python/in-depth-guides)
- [Quickstart: Register your app](./quickstart-register) — set up bot infrastructure with the Teams CLI
