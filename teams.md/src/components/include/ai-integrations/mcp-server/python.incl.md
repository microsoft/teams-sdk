<!-- intro -->

The official [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) ships a `FastMCP` helper for building [Model Context Protocol](https://modelcontextprotocol.io/introduction) servers. Mount it onto the same FastAPI server that hosts your Teams `App`, and external AI agents can use the bot to talk to real users — sending notifications, asking questions, and requesting approvals through Teams.

This guide walks through the pattern. Full source in [examples/mcp-server](https://github.com/microsoft/teams.py/tree/main/examples/mcp-server).

<!-- install -->

## Install

```bash
pip install mcp microsoft-teams-apps
```

You'll also need a Teams bot registration (`CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`).

<!-- first-tool -->

A tool is an async function decorated with `@mcp.tool()`. The docstring becomes the tool's description for MCP clients, and parameter type hints become its schema:

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("teams-bot")

@mcp.tool()
async def echo(message: str) -> str:
    """Echo back whatever was sent."""
    return f"You said: {message}"
```

Everything below adds Teams-aware tools to this same `mcp` instance.

<!-- proactive -->

To send a message into Teams, the tool needs a `conversation_id`. For 1:1 conversations the bot can create one on demand using `app.api.conversations.create`, then cache it for reuse:

```python
import os
from app import app  # your microsoft_teams.apps.App instance
from microsoft_teams.api import Account, CreateConversationParams

# user_id -> personal conversation_id
personal_conversations: dict[str, str] = {}

async def _get_or_create_conversation(user_id: str) -> str:
    if user_id in personal_conversations:
        return personal_conversations[user_id]
    resource = await app.api.conversations.create(
        CreateConversationParams(
            members=[Account(id=user_id)],
            tenant_id=os.getenv("TENANT_ID"),
        )
    )
    personal_conversations[user_id] = resource.id
    return resource.id

@mcp.tool()
async def notify(user_id: str, message: str) -> dict:
    """Send a one-way notification to a Teams user."""
    conversation_id = await _get_or_create_conversation(user_id)
    await app.send(conversation_id=conversation_id, activity=message)
    return {"notified": True, "user_id": user_id}
```

See [Proactive Messaging](../essentials/sending-messages/proactive-messaging) for more on how `app.send` works.

<!-- ask -->

MCP tools are short-lived — they can't block waiting for a Teams reply. The `ask` / `get_reply` pair splits the interaction in two: `ask` returns a `request_id` immediately, the user replies asynchronously, and the agent polls `get_reply` until the status flips from `pending` to `answered`.

Track pending asks in a small in-memory map (in production, use Redis or a database):

```python
import uuid
from dataclasses import dataclass

@dataclass
class PendingAsk:
    user_id: str
    status: str = "pending"
    reply: str = ""

pending_asks: dict[str, PendingAsk] = {}      # request_id -> PendingAsk
user_pending_ask: dict[str, str] = {}          # user_id -> outstanding request_id

@mcp.tool()
async def ask(user_id: str, question: str) -> dict:
    """Ask a Teams user a question. Returns a request_id — poll get_reply for the answer."""
    conversation_id = await _get_or_create_conversation(user_id)
    request_id = str(uuid.uuid4())
    await app.send(conversation_id=conversation_id, activity=question)
    pending_asks[request_id] = PendingAsk(user_id=user_id)
    user_pending_ask[user_id] = request_id
    return {"request_id": request_id}

@mcp.tool()
async def get_reply(request_id: str) -> dict:
    """Get the reply to a question. Status is 'pending' until the user responds."""
    entry = pending_asks.get(request_id)
    if not entry:
        raise ValueError(f"Unknown request_id {request_id}")
    return {"status": entry.status, "reply": entry.reply}
```

The bot's `on_message` handler captures the user's reply and writes it back into `pending_asks`:

```python
from microsoft_teams.api import MessageActivity
from microsoft_teams.apps import ActivityContext

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    user_id = ctx.activity.from_.id
    if ctx.activity.conversation.conversation_type == "personal":
        personal_conversations[user_id] = ctx.activity.conversation.id

    request_id = user_pending_ask.pop(user_id, None)
    if request_id and request_id in pending_asks:
        pending_asks[request_id].reply = ctx.activity.text or ""
        pending_asks[request_id].status = "answered"
        await ctx.reply("Got it, thank you!")
```

<!-- approval -->

For decisions, send an Adaptive Card with Approve / Reject buttons. The buttons emit a `card_action_execute` invoke that the bot handles to record the decision:

```python
from microsoft_teams.cards import AdaptiveCard, ExecuteAction, SubmitData, TextBlock

approvals: dict[str, str] = {}  # approval_id -> "pending" | "approved" | "rejected"

@mcp.tool()
async def request_approval(user_id: str, title: str, description: str) -> dict:
    """Send an Approve/Reject card. Returns an approval_id — poll get_approval for the decision."""
    conversation_id = await _get_or_create_conversation(user_id)
    approval_id = str(uuid.uuid4())
    card = AdaptiveCard(
        body=[
            TextBlock(text=title, weight="Bolder", size="Large", wrap=True),
            TextBlock(text=description, wrap=True),
        ],
        actions=[
            ExecuteAction(title="Approve").with_data(
                SubmitData("approval_response", {"approval_id": approval_id, "decision": "approved"})
            ),
            ExecuteAction(title="Reject").with_data(
                SubmitData("approval_response", {"approval_id": approval_id, "decision": "rejected"})
            ),
        ],
    )
    await app.send(conversation_id=conversation_id, activity=card)
    approvals[approval_id] = "pending"
    return {"approval_id": approval_id}

@mcp.tool()
async def get_approval(approval_id: str) -> dict:
    """Get an approval decision: 'pending', 'approved', or 'rejected'."""
    if approval_id not in approvals:
        raise ValueError(f"Unknown approval_id {approval_id}")
    return {"approval_id": approval_id, "status": approvals[approval_id]}
```

Handle the button click in the `App`:

```python
from microsoft_teams.api import (
    AdaptiveCardActionMessageResponse,
    AdaptiveCardInvokeActivity,
    AdaptiveCardInvokeResponse,
)

@app.on_card_action_execute("approval_response")
async def handle_approval(ctx: ActivityContext[AdaptiveCardInvokeActivity]) -> AdaptiveCardInvokeResponse:
    data = ctx.activity.value.action.data
    approval_id, decision = data.get("approval_id"), data.get("decision")
    if approval_id in approvals and decision in ("approved", "rejected"):
        approvals[approval_id] = decision
    return AdaptiveCardActionMessageResponse(
        status_code=200,
        type="application/vnd.microsoft.activity.message",
        value="Response recorded",
    )
```

<!-- wire-up -->

The MCP `streamable_http_app` mounts at the catch-all path `/`, so it must be mounted **after** the Teams app has registered its own routes — otherwise `/api/messages` will be shadowed:

```python
import asyncio
from microsoft_teams.apps.http.fastapi_adapter import FastAPIAdapter

async def main() -> None:
    # 1. Register Teams routes first.
    await app.initialize()

    adapter = app.server.adapter
    assert isinstance(adapter, FastAPIAdapter)

    # 2. Mount the MCP app at /.
    mcp_http_app = mcp.streamable_http_app()
    adapter.lifespans.append(mcp_http_app.router.lifespan_context)
    adapter.app.mount("/", mcp_http_app)

    # 3. Start the combined server.
    await app.start()

if __name__ == "__main__":
    asyncio.run(main())
```

The bot now serves Teams activity at `POST /api/messages` and the MCP endpoint at `http://localhost:3978/mcp`.

<!-- testing -->

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Open the URL printed in the terminal (it includes a required `MCP_PROXY_AUTH_TOKEN`), set transport to **Streamable HTTP** and the URL to `http://localhost:3978/mcp`, then connect. Call `ask` or `request_approval` with a `user_id`, respond in Teams, and poll for the result.

<!-- full-sample -->

## Full sample

The complete runnable code, including Pydantic response models and a typed state module, lives in [`microsoft/teams.py/examples/mcp-server`](https://github.com/microsoft/teams.py/tree/main/examples/mcp-server).
