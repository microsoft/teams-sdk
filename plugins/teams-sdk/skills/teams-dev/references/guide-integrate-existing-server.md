# Integrating Teams into an Existing Server

This guide helps you add Microsoft Teams bot functionality to an existing HTTP server without replacing your server architecture.

## How It Works

You pass your existing server's app instance into an adapter, then pass that adapter to the Teams `App`. When you call `initialize()`, the SDK registers its routes (like `/api/messages`) on your server. You keep full control of server lifecycle — the SDK never starts or stops your server.

The SDK ships with built-in adapters for common frameworks, but building a custom adapter for any other framework is simple — see the full docs linked below.

## Built-in Adapters

| Language | Adapter | Framework |
|----------|---------|-----------|
| TypeScript | `ExpressAdapter` | Express |
| Python | `FastAPIAdapter` | FastAPI (async) |

## Key Things to Know

- Call `initialize()`, NOT `start()` — you manage the server yourself
- **Python: `initialize()` is async** — you MUST `await` it. Without `await`, the coroutine silently does nothing, routes never register, and you get 404s on `/api/messages`
- The SDK registers routes on the exact app instance you pass to the adapter
- Your existing routes continue to work alongside Teams

## Full Documentation

The SDK docs cover everything: the adapter interface/protocol, step-by-step integration, and examples of building custom adapters for other frameworks (Restify for TypeScript, Starlette for Python).

**Read the full guide before implementing:**
- TypeScript: https://microsoft.github.io/teams-sdk/llms_docs/docs_typescript/self-managing-your-server.txt
- Python: https://microsoft.github.io/teams-sdk/llms_docs/docs_python/self-managing-your-server.txt
- C#: https://microsoft.github.io/teams-sdk/llms_docs/docs_csharp/self-managing-your-server.txt

## After Integration

Follow the **[Bot Infrastructure Setup guide](guide-create-bot-infra.md)** to:
- Create Teams-managed bot registration
- Get bot credentials (CLIENT_ID, CLIENT_SECRET, TENANT_ID)
- Set up a development tunnel
- Configure the bot messaging endpoint

**Important:** When setting up the devtunnel, use the port your existing server runs on (not the default `3978`) — the tunnel must expose the same port your server is already using.

## Related Guides

- **[Bot Infrastructure Setup](guide-create-bot-infra.md)** — Create bot registration and credentials
- **[Bot Application Development](guide-create-bot-app.md)** — Scaffold a new Teams bot project
- **[Troubleshooting](troubleshooting.md)** — Common issues and solutions
