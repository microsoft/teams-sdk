# Welcome to the Teams SDK v2 ([Docs](https://microsoft.github.io/teams-ai/))

Teams SDK v2 represents a fundamental reimagining of how Teams apps and AI agents are built, while maintaining compatibility with existing botframework-based agents. This new version focuses on developer experience, simplified architecture, and enhanced AI capabilities.

For a detailed explanation of the motivations and architectural decisions behind v2, please see our [WHY.md](https://microsoft.github.io/teams-ai/why) document.

## Code repositories per SDK language

The SDK code for each language are in individual repos:

- [Typescript](https://github.com/microsoft/teams.ts)
- [C#](https://github.com/microsoft/teams.net)
- [Python](https://github.com/microsoft/teams.py)

For language-specific bugs or issues, please use the Issues tab in the respective language repository.

### Quick start

The Teams SDK CLI makes it easy to bootstrap your first agent. First, install the CLI via NPM:

```sh
npm install -g @microsoft/teams.cli
```

Next, use the CLI to create your agent:

```sh
npx @microsoft/teams.cli new <typescript | csharp | python> quote-agent --template echo
```

For more information, follow our quickstart guide: [C#](http://microsoft.github.io/teams-ai/csharp/getting-started/quickstart), [Typescript](http://microsoft.github.io/teams-ai/typescript/getting-started/quickstart), [Python](http://microsoft.github.io/teams-ai/python/getting-started/quickstart)

### SDK

Microsoft Teams has a robust developer ecosystem with a broad suite of capabilities, now unified via Teams SDK. Whether you are building AI-powered agents ([TS](https://microsoft.github.io/teams-ai/typescript/in-depth-guides/ai/), [C#](https://microsoft.github.io/teams-ai/csharp/in-depth-guides/ai/), [Python](https://microsoft.github.io/teams-ai/python/in-depth-guides/ai/)), Message Extensions ([TS](https://microsoft.github.io/teams-ai/typescript/in-depth-guides/message-extensions/), [C#](https://microsoft.github.io/teams-ai/csharp/in-depth-guides/message-extensions/), [Python](https://microsoft.github.io/teams-ai/python/in-depth-guides/message-extensions/)), embedded web applications, or Graph, Teams SDK has you covered.

Here is a simple example, which responds to incoming messages with information retrieved from Graph.

```typescript
import { App } from '@microsoft/teams.apps';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App({
  plugins: [new DevtoolsPlugin()],
});

// Listen for incoming messages
app.on('message', async ({ userGraph, isSignedIn, send, signin }) => {
  if (!isSignedIn) {
    await signin(); // initiates Entra login flow
    return;
  }
  const me = await userGraph.call(endpoints.me.get);
  await send(`Hello, ${me.displayName} from Earth!`);
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
- The previous `main` branch (v1) has been moved to the [`release/v1`](https://github.com/microsoft/teams-ai/tree/release/v1) branch. We will continue to provide critical bug fixes and security patches for v1 on this branch.

## Documentation

For comprehensive documentation, API references, and examples, visit our [documentation site](https://microsoft.github.io/teams-ai/).
