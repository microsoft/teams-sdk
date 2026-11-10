# Welcome to the Teams SDK ([Docs](https://microsoft.github.io/teams-sdk/))

Teams SDK represents a fundamental reimagining of how Teams apps and AI agents are built, while maintaining compatibility with existing botframework-based agents. This new version focuses on developer experience, simplified architecture, and enhanced AI capabilities.

For a detailed explanation of the motivations and architectural decisions behind v2, please see our [WHY.md](https://microsoft.github.io/teams-sdk/why) document.

## We have a new name!

We are very excited to announce that "Teams AI" is now officially "Teams SDK"! This change reflects our commitment to providing a comprehensive development framework for building all types of Teams applications, including AI-powered agents.

## Code repositories per SDK language

The SDK code for each language are in individual repos:

- [Typescript](https://github.com/microsoft/teams.ts)
- [C#](https://github.com/microsoft/teams.net)
- [Python](https://github.com/microsoft/teams.py)

For language-specific bugs or issues, please use the Issues tab in the respective language repository.

## Quick start

The Teams Developer CLI makes it easy to bootstrap your first agent. First, install the CLI via NPM:

```sh
npm install -g @microsoft/teams.cli
```

Next, use the CLI to create your agent:

```sh
teams project new <typescript | csharp | python> quote-agent --template echo
```

For more information, follow our quickstart guide: [C#](http://microsoft.github.io/teams-sdk/csharp/getting-started/quickstart), [Typescript](http://microsoft.github.io/teams-sdk/typescript/getting-started/quickstart), [Python](http://microsoft.github.io/teams-sdk/python/getting-started/quickstart)

## SDK

Microsoft Teams has a robust developer ecosystem with a broad suite of capabilities, now unified via Teams SDK. Whether you are building AI-powered agents ([TS](https://microsoft.github.io/teams-sdk/typescript/in-depth-guides/ai-integrations/), [C#](https://microsoft.github.io/teams-sdk/csharp/in-depth-guides/ai-integrations/), [Python](https://microsoft.github.io/teams-sdk/python/in-depth-guides/ai-integrations/)), Message Extensions ([TS](https://microsoft.github.io/teams-sdk/typescript/in-depth-guides/message-extensions/), [C#](https://microsoft.github.io/teams-sdk/csharp/in-depth-guides/message-extensions/), [Python](https://microsoft.github.io/teams-sdk/python/in-depth-guides/message-extensions/)), embedded web applications, or Graph, Teams SDK has you covered.

Here is a simple example, which responds to incoming messages with information retrieved from Graph.

This example requires an OAuth connection named `graph` with Microsoft Graph `User.Read` permission. See the [user authentication guide](https://microsoft.github.io/teams-sdk/teams/user-authentication/) for setup.

```typescript
import { App } from '@microsoft/teams.apps';
import { Client as GraphClient } from '@microsoft/teams.graph';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App();
const graph = app.addOAuthFlow('graph');

app.on('message', async (ctx) => {
  const token = await graph.signIn(ctx);
  if (!token) return; // Sign-in is pending; completion is handled below.

  const client = new GraphClient({ token: () => token }, { baseUrlRoot: app.graphBaseUrl });
  const me = await client.call(endpoints.me.get);
  await ctx.send(`Hello, ${me.displayName} from Earth!`);
});

graph.onSignInComplete(async (ctx) => {
  await ctx.send('Signed in! Send another message to see your profile.');
});

// Start your application
(async () => {
  await app.start();
})();
```

For language-specific bugs or issues, please use the Issues tab in the respective language repository.

## Important: v1 to v2 Transition Notice

**This repository has transitioned from v1 to v2 as the main branch.**

- The `main` branch now contains v2 code, which was previously developed on the `v2-preview` branch.
- The previous `main` branch (v1) has been moved to the [`release/v1`](https://github.com/microsoft/teams-sdk/tree/release/v1) branch. We will continue to provide critical bug fixes and security patches for v1 on this branch.

## Documentation

For comprehensive documentation, API references, and examples, visit our [documentation site](https://microsoft.github.io/teams-sdk/).
