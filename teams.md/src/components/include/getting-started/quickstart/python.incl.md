<!-- prerequisites -->

- **Python** v3.12 or higher. Install or upgrade from [python.org/downloads](https://www.python.org/downloads/).

<!-- create-command -->

```sh
teams project new python quote-agent --template echo
```

<!-- create-explanation -->

1. Creates a new directory called `quote-agent`.
2. Bootstraps the echo agent template files into it under `quote-agent/src`.

<!-- running-steps -->

Navigate to your new agent's directory:

```sh
cd quote-agent
```

Create and activate a virtual environment, then install the dependencies:

```sh
python -m venv .venv
# Activate it: `source .venv/bin/activate` (macOS/Linux) or `.venv\Scripts\activate` (Windows)
pip install -e .
```

Start the development server:

```sh
python src/main.py
```

<!-- console-output -->

In the console, you should see a similar output:

```sh
[INFO] @teams/app Successfully initialized all plugins
[INFO] @teams/app.HttpPlugin Starting HTTP server on port 3978
INFO:     Started server process [6436]
INFO:     Waiting for application startup.
[INFO] @teams/app.HttpPlugin listening on port 3978 🚀
[INFO] @teams/app Teams app started successfully
INFO:     Application startup complete..
INFO:     Uvicorn running on http://0.0.0.0:3978 (Press CTRL+C to quit)
```

<!-- post-startup-explanation -->

The HTTP server is now listening on port `3978`. To test your agent locally without sideloading it into Teams, use the **[Microsoft 365 Agents Playground](/developer-tools/agents-playground)**.

The playground sends unauthenticated requests, so a default `App()` will reject them (you'll see the `No credentials configured` warning above). For local testing, enable `skip_auth` so your agent accepts them:

```python title="src/main.py"
app = App(skip_auth=True)
```

> [!WARNING]
> Only use `skip_auth` for local development — never in production, as it disables inbound request authentication.

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
pip install microsoft-teams-apps
```

<!-- manual-code -->

```python
import asyncio
import uvicorn
from fastapi import FastAPI
# highlight-next-line
from microsoft_teams.apps import App, FastAPIAdapter

# Your existing FastAPI app
my_fastapi = FastAPI()

# highlight-start
# Wrap your app in an adapter and create the Teams app
adapter = FastAPIAdapter(app=my_fastapi)
app = App(http_server_adapter=adapter)

@app.on_message
async def handle_message(ctx):
    await ctx.send(f"You said: {ctx.activity.text}")
# highlight-end

async def main():
    # highlight-next-line
    await app.initialize()  # Register the Teams endpoint (does not start a server)

    # Start your server as usual
    config = uvicorn.Config(app=my_fastapi, host="0.0.0.0", port=3978)
    server = uvicorn.Server(config)
    await server.serve()

asyncio.run(main())
```

<!-- manual-more -->

See the [HTTP Server guide](../in-depth-guides/server/http-server) for full details on adapters and custom server setups.

<!-- local-test-link -->

- [Microsoft 365 Agents Playground](/developer-tools/agents-playground)
