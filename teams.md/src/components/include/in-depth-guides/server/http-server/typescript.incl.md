<!-- default-framework -->

[Express](https://expressjs.com/)

<!-- adapter-interface -->

```typescript
interface IHttpServerAdapter {
  registerRoute(method: HttpMethod, path: string, handler: HttpRouteHandler): void;
  serveStatic?(path: string, directory: string): void;
  start?(port: number): Promise<void>;
  stop?(): Promise<void>;
}

type HttpRouteHandler = (request: { body: unknown; headers: Record<string, string | string[]> })
  => Promise<{ status: number; body?: unknown }>;
```

<!-- self-managed -->

```typescript
import http from 'http';
import express from 'express';
import { App, ExpressAdapter } from '@microsoft/teams.apps';

// 1. Create your Express app with your own routes
const expressApp = express();
const httpServer = http.createServer(expressApp);

expressApp.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

// 2. Wrap it in the ExpressAdapter
const adapter = new ExpressAdapter(httpServer);

// 3. Create the Teams app with the adapter
const app = new App({ httpServerAdapter: adapter });

app.on('message', async ({ send, activity }) => {
  await send(`Echo: ${activity.text}`);
});

// 4. Initialize — registers /api/messages on your Express app (does NOT start a server)
await app.initialize();

// 5. Start the server yourself
httpServer.listen(3978, () => console.log('Server ready on http://localhost:3978'));
```

> See the full [Express adapter example](https://github.com/microsoft/teams.ts/tree/main/examples/http-adapters/express)

<!-- custom-adapter -->

Here is a Restify adapter — only `registerRoute` is needed:

```typescript
import restify from 'restify';
import { HttpMethod, IHttpServerAdapter, HttpRouteHandler } from '@microsoft/teams.apps';

class RestifyAdapter implements IHttpServerAdapter {
  constructor(private server: restify.Server) {
    this.server.use(restify.plugins.bodyParser());
  }

  registerRoute(method: HttpMethod, path: string, handler: HttpRouteHandler): void {
    // Teams only sends POST requests to your bot endpoint
    assert(method === 'POST', `Unsupported method: ${method}`);
    this.server.post(path, async (req: restify.Request, res: restify.Response) => {
      const response = await handler({
        body: req.body,
        headers: req.headers as Record<string, string | string[]>,
      });
      res.send(response.status, response.body);
    });
  }
}
```

Usage:

```typescript
const server = restify.createServer();
const adapter = new RestifyAdapter(server);
const app = new App({ httpServerAdapter: adapter });
await app.initialize();
server.listen(3978);
```

> See the full implementation: [Restify adapter example](https://github.com/microsoft/teams.ts/tree/main/examples/http-adapters/restify)
