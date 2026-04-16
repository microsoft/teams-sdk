# Integrating Teams into an Existing Server

This guide helps you add Microsoft Teams bot functionality to an existing HTTP server (Express, Flask, FastAPI, etc.) using the Teams SDK's HTTP server adapters (ExpressAdapter, FlaskAdapter, etc.).

## Overview

The Teams SDK allows you to integrate Teams bot capabilities into your existing server without changing your server architecture. You manage your server lifecycle independently while the SDK handles Teams-specific functionality.

**Official Documentation:**
- TypeScript: https://microsoft.github.io/teams-sdk/typescript/in-depth-guides/server/http-server
- Python: https://microsoft.github.io/teams-sdk/python/in-depth-guides/server/http-server

## High-Level Flow

### 1. Install Teams SDK

**TypeScript:**
```bash
npm install @microsoft/teams.apps
```

**Python:**
```bash
pip install microsoft-teams-apps
```

### 2. Create the Adapter

**TypeScript (Express):**
```typescript
import express from 'express';
import { App, ExpressAdapter } from '@microsoft/teams.apps';

const app = express();
app.use(express.json());

// Your existing routes here...
app.post('/your-endpoint', ...);

// Create adapter - pass Express app instance, NOT http.Server
const adapter = new ExpressAdapter(app);
const teamsApp = new App({ httpServerAdapter: adapter });
```

**Python (Flask):**
```python
from flask import Flask
from microsoft_teams.apps import App
from microsoft_teams.hosting.flask import FlaskAdapter

app = Flask(__name__)

# Your existing routes here...
@app.route('/your-endpoint')
def your_endpoint():
    ...

# Create adapter
adapter = FlaskAdapter(app)
teams_app = App(http_server_adapter=adapter)
```

### 3. Add Bot Message Handler

**TypeScript:**
```typescript
teamsApp.on('message', async ({ send, activity }) => {
  const userMessage = activity.text || '';
  // Your bot logic here...
  await send('Response message');
});
```

**Python:**
```python
@teams_app.on_message()
async def on_message(context):
    user_message = context.activity.text
    # Your bot logic here...
    await context.send('Response message')
```

### 4. Initialize Teams App

**Important**: Call `initialize()`, NOT `start()` - you manage the server yourself.

**TypeScript:**
```typescript
await teamsApp.initialize();

// Start your server as usual
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Python:**
```python
teams_app.initialize()

# Start your server as usual
if __name__ == '__main__':
    app.run(port=3000)
```

### 5. Set Up Bot Infrastructure, Tunnel, and Endpoint

Follow the **[Bot Infrastructure Setup guide](guide-create-bot-infra.md)** to complete the remaining setup:
- Create Teams-managed bot registration
- Get bot credentials (CLIENT_ID, CLIENT_SECRET, TENANT_ID)
- Configure environment variables
- Set up development tunnel (devtunnels)
- Configure bot messaging endpoint
- Test your bot in Teams

**Important:** When setting up the devtunnel, use the port your existing server runs on (e.g., `3000`, `5000`, `8080`) instead of the default `3978`. The tunnel must expose the same port your server is already configured to use.

## Key Points

✅ **Adapter Parameter**: Pass your server app instance to the adapter, not an http.Server wrapper
✅ **Initialize vs Start**: Call `teamsApp.initialize()`, NOT `teamsApp.start()`
✅ **Existing Routes**: Your existing endpoints continue to work alongside Teams bot functionality
✅ **Server Management**: You control server lifecycle - the adapter only handles Teams-specific routes

## Common Errors

**ERR_HTTP_HEADERS_SENT**: You likely passed http.Server to the adapter instead of the app instance. Pass the app directly.

## Related Guides

- **[Bot Infrastructure Setup](guide-create-bot-infra.md)** - Create bot registration and credentials
- **[Bot Application Development](guide-create-bot-app.md)** - Scaffold a new Teams bot project
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
