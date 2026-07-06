<!-- prerequisites -->

- **Node.js** v.20 or higher. Install or upgrade from [nodejs.org](https://nodejs.org/).

<!-- create-command -->

```sh
teams project new typescript quote-agent --template echo
```

<!-- create-explanation -->

1. Creates a new directory called `quote-agent`.
2. Bootstraps the echo agent template files into it under `quote-agent/src`.

<!-- running-steps -->

1. Navigate to your new agent's directory:

```sh
cd quote-agent
```

2. Install the dependencies:

```sh
npm install
```

3. Start the development server:

```sh
npm run dev
```

<!-- console-output -->

4. In the console, you should see a similar output:

```sh
> quote-agent@0.0.0 dev
> tsx watch -r dotenv/config src/index.ts

[WARN] @teams/app No credentials configured and skipAuth is not enabled. All incoming requests will be rejected. Configure client authentication to securely receive messages, or set skipAuth: true for local development.
[INFO] @teams/app listening on port 3978 🚀
```

<!-- post-startup-explanation -->

The HTTP server is now listening on port `3978`. To test your agent locally without sideloading it into Teams, use the **[Microsoft 365 Agents Playground](/developer-tools/agents-playground)**.

The playground sends unauthenticated requests, so a default `new App()` will reject them (you'll see the `No credentials configured` warning above). For local testing, enable `skipAuth` so your agent accepts them:

```typescript title="src/index.ts"
const app = new App({ skipAuth: true });
```

> [!WARNING]
> Only use `skipAuth` for local development — never in production, as it disables inbound request authentication.

Install the playground globally:

```sh
npm install -g @microsoft/m365agentsplayground
```

Then, with your agent still running, open a second terminal and launch the playground pointed at your agent:

```sh
agentsplayground -e http://localhost:3978/api/messages -c emulator
```

The playground opens at [http://localhost:56150](http://localhost:56150). Send a message in the compose box and your agent's reply renders inline.

![Microsoft 365 Agents Playground showing a user message 'hello!' and an agent reply 'you said "hello!"'.](/screenshots/agents-playground-echo-chat.png)

<!-- manual-install -->

```sh
npm i @microsoft/teams.apps
```

<!-- manual-code -->

```typescript
import http from 'http';
import express from 'express';
// highlight-next-line
import { App, ExpressAdapter } from '@microsoft/teams.apps';

// Your existing Express server
const expressApp = express();
const server = http.createServer(expressApp);

// highlight-start
// Wrap your server in an adapter and create the Teams app
const adapter = new ExpressAdapter(server);
const app = new App({ httpServerAdapter: adapter });

app.on('message', async ({ send, activity }) => {
  await send(`You said: ${activity.text}`);
});

// Register the Teams endpoint on your server (does not start it)
await app.initialize();
// highlight-end

// Start your server as usual
server.listen(3978);
```

<!-- manual-more -->

See the [HTTP Server guide](../in-depth-guides/server/http-server) for full details on adapters and custom server setups.

<!-- local-test-link -->

- [Microsoft 365 Agents Playground](/developer-tools/agents-playground)
