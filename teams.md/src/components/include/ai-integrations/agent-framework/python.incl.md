<!-- intro -->

[Microsoft Agent Framework](https://github.com/microsoft/agent-framework) is an SDK for building AI agents in Python. It plugs cleanly into the Teams SDK: the `App` handles activities, and the agent handles reasoning, tool calls, and streaming. This guide walks through building one — full source in [examples/ai-agentframework](https://github.com/microsoft/teams.py/tree/main/examples/ai-agentframework).

<!-- install -->

## Install

```bash
pip install agent-framework microsoft-teams-apps python-dotenv
```

You'll also need an Azure OpenAI resource with a deployed model and a Teams bot registration.

<!-- env -->

## Environment

Add the following to your `.env`:

```env
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_MODEL=<deployment-name>
AZURE_OPENAI_API_KEY=<api-key>

CLIENT_ID=<app-id>
TENANT_ID=<tenant-id>
CLIENT_SECRET=<client-secret>
```

`AZURE_OPENAI_MODEL` is your **deployment name**, not the base model name. To use a Service Principal instead of an API key, swap `api_key` for a `ClientSecretCredential` from `azure.identity` when constructing the `OpenAIChatClient`.

<!-- agent -->

An `Agent` wraps a chat client, instructions, and a list of tools. Start with just the chat client:

```python
from agent_framework import Agent
from agent_framework.openai import OpenAIChatClient
from os import getenv

client = OpenAIChatClient(
    model=getenv("AZURE_OPENAI_MODEL"),
    azure_endpoint=getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=getenv("AZURE_OPENAI_API_KEY"),
)

agent = Agent(
    client=client,
    instructions="You are a helpful Teams assistant.",
)
```

<!-- local-tools -->

Local tools are async functions decorated with `@tool`. Use `Annotated` + `pydantic.Field` to describe parameters — the agent uses these descriptions when deciding to call the tool.

The tool below queues an Adaptive Card to be attached to the bot's reply. A `ContextVar` keeps the card list scoped to the current turn so concurrent conversations don't interfere with one another:

```python
from contextvars import ContextVar
from typing import Annotated
from agent_framework import tool
from microsoft_teams.cards import AdaptiveCard, TextBlock
from pydantic import Field

pending_cards: ContextVar[list[AdaptiveCard] | None] = ContextVar(
    "pending_cards", default=None
)

@tool
async def send_welcome_card(
    greeting: Annotated[str, Field(description="Greeting message, e.g. 'Hello, Alex!'")],
) -> str:
    """Attach a welcome card to the reply."""
    cards = pending_cards.get()
    if cards is None:
        return "No active turn context."
    cards.append(AdaptiveCard(version="1.5").with_body([
        TextBlock(text=greeting, size="Large", weight="Bolder", wrap=True),
    ]))
    return "Card attached."
```

Pass it to the `Agent` via `tools=[send_welcome_card]`.

<!-- mcp-tools -->

Remote MCP servers expose tools the agent can call over HTTP. Declare them with `MCPStreamableHTTPTool`:

```python
from agent_framework import MCPStreamableHTTPTool

mcp_tools = [
    MCPStreamableHTTPTool(name="MSLearn", url="https://learn.microsoft.com/api/mcp"),
]

agent = Agent(
    client=client,
    instructions="You are a helpful Teams assistant.",
    tools=[send_welcome_card, *mcp_tools],
)
```

The agent will discover the tools the MCP server exposes and call them as needed.

<!-- streaming -->

Use `agent.run(text, stream=True)` and forward each chunk to Teams via `ctx.stream.emit(...)`. Teams renders the response token-by-token:

```python
from microsoft_teams.api import MessageActivity
from microsoft_teams.apps import ActivityContext, App

app = App()

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    full_text = ""
    async for chunk in agent.run(ctx.activity.text or "", stream=True):
        if chunk.text:
            ctx.stream.emit(chunk.text)
            full_text += chunk.text
```

The accumulated `full_text` is used in the next step to attach citations.

<!-- citations -->

To attach citations from MCP search results, install a `FunctionMiddleware` on the agent. The middleware inspects every tool result, extracts URLs, and tags each one with a position marker (`[1]`, `[2]`, …) the model can cite inline:

```python
import json
from agent_framework import FunctionMiddleware

class CitationMiddleware(FunctionMiddleware):
    citations: dict[str, dict] = {}

    async def process(self, context, call_next):
        await call_next()
        try:
            parsed = json.loads(context.result)
        except (json.JSONDecodeError, TypeError):
            return
        for item in parsed.get("results", []):
            url = item.get("contentUrl") or item.get("link")
            if not url or url in self.citations:
                continue
            pos = len(self.citations) + 1
            self.citations[url] = {
                "position": pos,
                "url": url,
                "title": item.get("title", ""),
                "snippet": (item.get("content") or "")[:160],
            }
            item["citation"] = f"[{pos}]"
        context.result = json.dumps(parsed)

tool_logger = CitationMiddleware()
agent = Agent(client=client, instructions=..., tools=..., middleware=[tool_logger])
```

In the message handler, reset the citation map and card bucket per-turn, then attach only those citations the model actually referenced:

```python
import re
from microsoft_teams.api import CitationAppearance, MessageActivityInput

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    tool_logger.citations = {}
    cards: list[AdaptiveCard] = []
    pending_cards.set(cards)

    full_text = ""
    async for chunk in agent.run(ctx.activity.text or "", stream=True):
        if chunk.text:
            ctx.stream.emit(chunk.text)
            full_text += chunk.text

    reply = MessageActivityInput().add_ai_generated().add_feedback(mode="custom")
    for card in cards:
        reply.add_card(card)

    used = {int(n) for n in re.findall(r"\[(\d+)\]", full_text)}
    for c in tool_logger.citations.values():
        if c["position"] in used:
            reply.add_citation(
                position=c["position"],
                appearance=CitationAppearance(
                    name=c["title"] or f"Source {c['position']}",
                    abstract=c["snippet"] or "No description available.",
                    url=c["url"],
                ),
            )

    ctx.stream.emit(reply)
```

`add_ai_generated()` adds the Teams "AI-generated" label, and `add_feedback(mode="custom")` enables thumbs up/down with a custom feedback form. See [Feedback](../in-depth-guides/feedback) for the form-handling side.

<!-- memory -->

The agent is stateless by default — every call sees only the current message. Use `agent.create_session()` and reuse the session per conversation to give the agent memory across turns:

```python
from agent_framework import AgentSession

_sessions: dict[str, AgentSession] = {}

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    conversation_id = ctx.activity.conversation.id
    session = _sessions.setdefault(conversation_id, agent.create_session())

    async for chunk in agent.run(ctx.activity.text or "", session=session, stream=True):
        ...
```

For production, persist sessions to a store of your choice rather than holding them in a process-local dict.

<!-- full-sample -->

## Full sample

The complete runnable code, including feedback form handling and suggested actions, lives in [`microsoft/teams.py/examples/ai-agentframework`](https://github.com/microsoft/teams.py/tree/main/examples/ai-agentframework).
