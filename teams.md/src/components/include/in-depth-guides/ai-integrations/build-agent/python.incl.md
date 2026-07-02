<!-- intro -->

This guide walks through building a Teams agent with [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/) (MAF) — Microsoft's open-source SDK for AI agents. MAF gives you typed primitives — `Agent`, `tool`, `AgentSession`, `FunctionMiddleware` — that wrap the underlying model API, the tool-dispatch loop, and conversation history into composable pieces, so you don't hand-roll chat completions or thread tool calls yourself. It works against multiple model backends (OpenAI, Azure OpenAI, and others) and scales from a single chat agent up to coordinated multi-agent workflows.

In a Teams app, MAF runs the agent loop (model calls, tool invocations, and per-conversation memory) while the Teams SDK handles activity routing, streaming, and Teams-native affordances like Adaptive Cards and feedback controls.

Full source: [examples/ai-mcp](https://github.com/microsoft/teams.py/tree/main/examples/ai-mcp).

<!-- define-agent -->

```python
from agent_framework import Agent
from agent_framework.openai import OpenAIChatClient

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

<!-- local-tool -->

Tools are declared with the `@tool` decorator from Agent Framework. The function name, docstring, and type annotations tell the model when and how to call the tool.

```python
from typing import Annotated

from agent_framework import tool
from microsoft_teams.cards import AdaptiveCard, Choice, ChoiceSetInput, ExecuteAction, SubmitData, TextBlock
from pydantic import Field

CLARIFICATION_VERB = "clarification"
CLARIFICATION_INPUT_ID = "clarificationChoice"

@tool
async def request_clarification(
    question: Annotated[str, Field(description="The clarification question to ask the user.")],
    options: Annotated[list[str], Field(description="2-4 candidate interpretations the user can pick between.")],
) -> str:
    """Show an Adaptive Card asking the user to clarify their ambiguous request."""
    cards = pending_cards.get()
    if cards is None:
        return "No active turn context; card could not be attached."
    card = AdaptiveCard(version="1.6").with_body([
        TextBlock(text=question, weight="Bolder", size="Medium", wrap=True),
        ChoiceSetInput(
            id=CLARIFICATION_INPUT_ID,
            choices=[Choice(title=o, value=o) for o in options],
            is_required=True,
        ),
    ]).with_actions([
        ExecuteAction(title="Submit")
        .with_data(SubmitData(CLARIFICATION_VERB, {CLARIFICATION_INPUT_ID: ""}))
        .with_associated_inputs("auto"),
    ])
    cards.append(card)
    return "Clarification card attached."
```

See [clarification cards](./teams-enhancements#clarification-cards) for how the user's choice flows back in.

<!-- mcp-tools -->

Remote tools are declared using MCP tool wrappers from Agent Framework and passed to the agent just like local tools:

```python
from agent_framework import MCPStreamableHTTPTool

mcp_tools = [
    MCPStreamableHTTPTool(name="MSLearn", url="https://learn.microsoft.com/api/mcp"),
]

agent = Agent(
    client=client,
    instructions="You are a helpful Teams assistant with access to local tools and remote MCP servers.",
    tools=[request_clarification, *mcp_tools],
)
```

<!-- running -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    async for chunk in agent.run(ctx.activity.text or "", stream=True):
        if chunk.text:
            ctx.stream.emit(chunk.text)
```

<!-- memory -->

A **session** provides a conversation buffer that maintains state across turns. Create one per Teams conversation and reuse it for subsequent messages:

```python
from agent_framework import AgentSession

_sessions: dict[str, AgentSession] = {}

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    conversation_id = ctx.activity.conversation.id
    session = _sessions.setdefault(conversation_id, agent.create_session())

    async for chunk in agent.run(ctx.activity.text or "", session=session, stream=True):
        if chunk.text:
            ctx.stream.emit(chunk.text)
```

<!-- citations -->

In Agent Framework this is a `FunctionMiddleware` — it sits between tool execution and the model response, letting you inspect and transform results without coupling that logic to the agent. Override `process`, run the wrapped tool with `call_next()`, then post-process its result.

```python
import json
from typing import Any

from agent_framework import FunctionInvocationContext, FunctionMiddleware

class CitationMiddleware(FunctionMiddleware):
    citations: dict[str, Any]

    async def process(self, context: FunctionInvocationContext, call_next) -> None:
        # Run the wrapped tool first, then post-process its result.
        await call_next()

        parsed = json.loads(context.result)
        for item in parsed.get("results", []):
            url = item.get("contentUrl") or item.get("link")
            if not url:
                continue
            # setdefault dedupes by URL — the same source returned by multiple
            # tool calls keeps a single, stable position.
            entry = self.citations.setdefault(url, {
                "position": len(self.citations) + 1,
                "url": url,
                "title": item.get("title") or "",
                "snippet": (item.get("content") or item.get("description") or "")[:160],
            })
            # Hand the marker back to the model so it can cite this source inline.
            item["citation"] = f"[{entry['position']}]"
        context.result = json.dumps(parsed)


tool_logger = CitationMiddleware()
agent = Agent(
    client=client,
    instructions=(
        "You are a helpful Teams assistant with access to local tools and remote MCP servers. "
        'When you use information from a search tool, cite your sources inline using the "citation" value.'
    ),
    tools=[request_clarification, *mcp_tools],
    middleware=[tool_logger],
)
```
