<!-- default-framework -->

[FastAPI](https://fastapi.tiangolo.com/)

<!-- adapter-interface -->

```python
class HttpServerAdapter(Protocol):
    def register_route(self, method: HttpMethod, path: str, handler: HttpRouteHandler) -> None: ...
    def serve_static(self, path: str, directory: str) -> None: ...
    async def start(self, port: int) -> None: ...
    async def stop(self) -> None: ...

class HttpRouteHandler(Protocol):
    async def __call__(self, request: HttpRequest) -> HttpResponse: ...
```

<!-- self-managed -->

```python
import asyncio
import uvicorn
from fastapi import FastAPI
from microsoft_teams.apps import App, FastAPIAdapter

# 1. Create your FastAPI app with your own routes
my_fastapi = FastAPI(title="My App + Teams Bot")

@my_fastapi.get("/health")
async def health():
    return {"status": "healthy"}

# 2. Wrap it in the FastAPIAdapter
adapter = FastAPIAdapter(app=my_fastapi)

# 3. Create the Teams app with the adapter
app = App(http_server_adapter=adapter)

@app.on_message
async def handle_message(ctx):
    await ctx.send(f"Echo: {ctx.activity.text}")

async def main():
    # 4. Initialize — registers /api/messages on your FastAPI app (does NOT start a server)
    await app.initialize()

    # 5. Start the server yourself
    config = uvicorn.Config(app=my_fastapi, host="0.0.0.0", port=3978)
    server = uvicorn.Server(config)
    await server.serve()

asyncio.run(main())
```

> See the full example: [FastAPI non-managed example](https://github.com/microsoft/teams.py/tree/main/examples/http-adapters/src/fastapi_non_managed.py)

<!-- custom-adapter -->

Here is a Starlette adapter — only `register_route` is needed:

```python
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route
from microsoft_teams.apps.http.adapter import HttpMethod, HttpRequest, HttpResponse, HttpRouteHandler

class StarletteAdapter:
    def __init__(self, app: Starlette):
        self._app = app

    def register_route(self, method: HttpMethod, path: str, handler: HttpRouteHandler) -> None:
        # Teams only sends POST requests to your bot endpoint
        async def starlette_handler(request: Request) -> Response:
            body = await request.json()
            headers = dict(request.headers)
            result: HttpResponse = await handler(HttpRequest(body=body, headers=headers))
            if result.get("body") is not None:
                return JSONResponse(content=result["body"], status_code=result["status"])
            return Response(status_code=result["status"])

        route = Route(path, starlette_handler, methods=[method])
        self._app.routes.insert(0, route)
```

Usage:

```python
starlette_app = Starlette()
adapter = StarletteAdapter(starlette_app)
app = App(http_server_adapter=adapter)
await app.initialize()
# Start Starlette with uvicorn yourself
```

> See the full implementation: [Starlette adapter example](https://github.com/microsoft/teams.py/tree/main/examples/http-adapters/src/starlette_adapter.py)
