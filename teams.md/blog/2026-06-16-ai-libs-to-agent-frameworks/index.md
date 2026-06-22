---
slug: ai-libraries-to-agent-frameworks
title: "Unbundling AI from the Teams SDK: A Cleaner Path to Agents"
date: 2026-06-16
authors:
  - name: Mehak Bindra
    title: Microsoft
    url: https://github.com/mehakbindra
    image_url: https://github.com/mehakbindra.png
tags: [teams-sdk, agents, ai, mcp, a2a, migration]
description: The Teams SDK's built-in AI libraries were a bridge to agent development. Dedicated agent frameworks now provide the structure, patterns, and safety nets your agents need. Here's what's deprecated and how to migrate.
---

When the Teams SDK first introduced built-in LLM support, it provided a good foundation for basic agent use cases: prompt templates, a simple chat loop, and model integration. It worked for many developers and solved the immediate problem of "how do I wire an LLM into my Teams bot?"

But the agent ecosystem moved fast. Over the past year, dedicated agent frameworks matured with features that outpaced the Teams SDK: sophisticated multi-turn reasoning loops, real-time observability and token counting, function calling with automatic retries, and first-class session management tied to conversation scoping. The Teams SDK's AI libraries had the basics, including MCP and A2A support, but couldn't iterate fast enough to match the pace of frameworks and platforms like the Microsoft Agent Framework, LangChain, and Foundry, which shipped new agent patterns monthly.

Today, dedicated frameworks offer what the Teams AI libraries couldn't keep up with: battle-tested agentic patterns, comprehensive streaming with token-level control, built-in observability for cost and latency, automatic tool retry logic, and session management with persistence strategies baked in. The Teams SDK's role is to integrate these frameworks cleanly, not to try to be one.

We're moving away from the Teams AI helpers (`ChatPrompt`, `McpPlugin`, etc.). Rather than bundling AI logic, the Teams SDK gives you dedicated, Teams-native building blocks (streaming, cards, citations, feedback) for running a framework-built agent in Teams. If you're using the Teams AI integrations today, here's what's changing and how to migrate.

<!-- truncate -->

## What's Changing

The Teams SDK's built-in AI helpers (`ChatPrompt`, the OpenAI model, and the MCP and A2A plugins) are deprecated in TypeScript and .NET, and already removed in Python. The TypeScript and .NET packages are still maintained for now but will be removed, so migrate to a dedicated framework. The [full package list](#deprecated-packages) is below.

## How to Choose Your Path Forward

Not every bot needs a framework. Pick the lightest option that covers what your bot actually does.

| If your bot… | Reach for | Why |
| --- | --- | --- |
| Replies in one shot (no tools, no memory) | An LLM SDK directly (OpenAI, Azure OpenAI, Anthropic) | Least overhead: the Teams handler calls the model and streams the reply, nothing else to wire up. |
| Calls tools, tracks history, or reasons across turns | A dedicated agent framework | The framework owns the tool loop, session state, and retries; you connect it to the Teams handler. |
| Already runs on a framework (LangChain, Foundry, Agent Framework) | Keep what you have | You weren't leaning on the Teams AI helpers, so the deprecation doesn't touch you. |

**Recommended starting points by language:**

- **TypeScript**: the [OpenAI SDK](https://github.com/openai/openai-node) (its `runTools` helper runs the tool loop for you), the [Vercel AI SDK](https://ai-sdk.dev) (streaming, tool calling, multi-provider), or [LangChain.js](https://js.langchain.com/).
- **.NET**: the [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/) for full agents, or [Microsoft.Extensions.AI](https://learn.microsoft.com/en-us/dotnet/ai/microsoft-extensions-ai) for direct `IChatClient` calls with function invocation.
- **Python**: the [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/) (typed tools, sessions, streaming, as used by the `ai-mcp` example) or [LangChain](https://python.langchain.com/).

For a managed option across languages, [Microsoft Foundry](https://learn.microsoft.com/en-us/azure/foundry/) handles orchestration, evaluation, and deployment for you.

Whichever you pick, the Teams SDK doesn't change: it owns routing, streaming, cards, and feedback. The framework owns the agent.

## A Migration Walkthrough

Your Teams handler doesn't move: `app.on('message')`, `teams.OnMessage`, and `@app.on_message` stay exactly as they are, and conversation references, membership, deployment, and manifests are unaffected. What changes is the AI work inside it. The walkthrough below uses Python and the Microsoft Agent Framework; your language and framework choice changes the specific APIs (the linked .NET and TypeScript samples use Microsoft.Extensions.AI and the OpenAI SDK), but the moving parts are the same.

**Model / client**: a Teams AI model wrapped in a `ChatPrompt` becomes your provider's own SDK client.

```python
# Old: OpenAICompletionsAIModel inside a ChatPrompt
prompt = ChatPrompt(
    OpenAICompletionsAIModel(model="gpt-4o", key=os.getenv("OPENAI_API_KEY")),
)
```

```python
# New: your provider's own client
client = OpenAIChatClient(
    model=os.getenv("AZURE_OPENAI_MODEL"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
)
```

**Instructions**: the `instructions` you passed to `ChatPrompt.send()` move onto the agent.

```python
agent = Agent(client=client, instructions="You are a helpful Teams assistant.")
```

**Tools**: `ChatPrompt.with_function()` made you hand-write the JSON schema; a typed `@tool` function lets the framework derive it.

```python
# Old: with_function, with the parameter schema written by hand
prompt.with_function(
    name="fetch_data",
    description="Fetch data by ID",
    parameter_schema={"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"]},
    handler=fetch_data,
)
```

```python
# New: @tool derives the schema from the function's type hints
@tool
async def fetch_data(id: Annotated[str, Field(description="The data ID to fetch")]) -> str:
    """Fetch data by ID."""
    return f"Data for {id}"

agent = Agent(client=client, instructions=..., tools=[fetch_data])
```

**Tool loop and streaming**: what `ChatPrompt.send(on_chunk=…)` did in one call, `agent.run(stream=True)` does: drives the call → result → re-prompt loop and streams tokens as they arrive.

```python
async for chunk in agent.run(text, session=session, stream=True):
    if chunk.text:
        ctx.stream.emit(chunk.text)
```

**History**: `ChatPrompt`'s `Memory` becomes a first-class session object, one per conversation.

```python
session = agent.create_session()  # keyed by ctx.activity.conversation.id
```

Full runnable versions, with MCP tools, source citations, and Adaptive Cards: **TypeScript** [ai-mcp](https://github.com/microsoft/teams.ts/tree/main/examples/ai-mcp) · **.NET** [ExtAIBot](https://github.com/microsoft/teams.net/tree/main/core/samples/ExtAIBot) · **Python** [ai-mcp](https://github.com/microsoft/teams.py/tree/main/examples/ai-mcp).

Also: MCP server ([TypeScript](https://github.com/microsoft/teams.ts/tree/main/examples/mcp-server) · [.NET](https://github.com/microsoft/teams.net/tree/main/core/samples/McpServer) · [Python](https://github.com/microsoft/teams.py/tree/main/examples/mcp-server)) and agent-to-agent ([TypeScript](https://github.com/microsoft/teams.ts/tree/main/examples/a2a) · [.NET](https://github.com/microsoft/teams.net/tree/main/core/samples/A2ABot) · [Python](https://github.com/microsoft/teams.py/tree/main/examples/a2a)).

## Capabilities You No Longer Build Yourself

The Teams AI libraries never provided these, so you wired them up yourself. Migrate to a framework and you get them all out of the box:

| Capability | Teams AI Libraries | Dedicated Frameworks |
| --- | --- | --- |
| Tool calling | Inject tool descriptions as text into prompts; model parses tool calls from response text | Native structured function calling APIs; typed tool definitions with automatic dispatch |
| Function failure handling | You write retry logic and error handling manually | Automatic retries, validation, error recovery built-in |
| Observability | Wire up your own logging and tracking; no built-in metrics | Built-in callbacks for every step; automatic token counting, cost tracking, dashboards |
| Session management | Manually manage conversation history and state persistence | Built-in session management handles persistence, scoping, and cleanup automatically |
| Conversation scoping | Manually track which conversation owns which state | Automatic scoping tied to Teams conversation context |
| Multi-agent patterns | No support; you write orchestration yourself | Native support for agent-to-agent handoff, hierarchical agents, composition |
| Model switching | Tied to library version; requires code changes to swap | Abstracted provider; swap OpenAI to Azure OpenAI to Anthropic without code changes |

These gaps mean developers rebuilding the same solutions repeatedly: retries, observability, session state. That's exactly what dedicated frameworks solve.

## What We're Investing In

While we're moving away from Teams AI libraries, the Teams SDK is investing in being the best place to host a framework-built agent:

- **Teams-native building blocks** for agent UX: streaming, rich cards, citations, and feedback
- **Conversation context and scoping** your framework can build on
- **Capability hooks** for MCP servers, custom tools, and Adaptive Cards as tool outputs
- **Examples and documentation** for common agent scenarios across frameworks
- **Observability and debugging** for agents running in Teams

The goal is clarity: the Teams SDK owns Teams routing and affordances. Agent frameworks own agent logic. Together, they're better than either alone.

## Deprecated Packages

- **TypeScript:** The following packages are deprecated and will be removed in a future release:
  - `@microsoft/teams.ai`
  - `@microsoft/teams.openai`
  - `@microsoft/teams.mcp`
  - `@microsoft/teams.mcpclient`
  - `@microsoft/teams.a2a`

- **.NET:** The following packages are deprecated and will be removed in a future release:
  - `Microsoft.Teams.AI`
  - `Microsoft.Teams.AI.Models.OpenAI`
  - `Microsoft.Teams.Plugins.External.Mcp`
  - `Microsoft.Teams.Plugins.External.McpClient`

- **Python:** The following packages have been removed from the Teams SDK and are no longer supported:
  - `microsoft-teams-ai`
  - `microsoft-teams-openai`
  - `microsoft-teams-mcpplugin`
  - `microsoft-teams-a2a`

## Migration Timeline

- **Now:** TypeScript and .NET are deprecated but still functional and published (npm, NuGet). Python's packages have already been removed from the SDK and are no longer supported.
- **End of Q3 2026:** The deprecated packages are removed and stop receiving fixes.

Migrate as you adopt a framework. The sooner you move, the sooner you're off a deprecated path.

## Further Reading

**Frameworks & platforms**
- [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/): Python and .NET; typed tools, sessions, streaming.
- [Microsoft.Extensions.AI](https://learn.microsoft.com/en-us/dotnet/ai/microsoft-extensions-ai): the .NET `IChatClient` abstractions used in the .NET migration.
- [Microsoft Foundry](https://learn.microsoft.com/en-us/azure/foundry/): managed agent platform with orchestration and evaluation.

**LLM SDKs** (for the direct, no-framework path)
- [OpenAI](https://platform.openai.com/docs/libraries) · [Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/supported-languages) · [Anthropic](https://docs.anthropic.com/en/api/client-sdks) · [Google Gemini](https://ai.google.dev/gemini-api/docs/libraries) · [Mistral](https://docs.mistral.ai/getting-started/clients/)

**Protocols**
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io): for building or connecting tools and servers.
- [Agent2Agent (A2A)](https://a2a-protocol.org): for agent-to-agent communication and handoff across frameworks.

Hit a rough edge during migration? Open an issue on the SDK repo: [teams.ts](https://github.com/microsoft/teams.ts) · [teams.net](https://github.com/microsoft/teams.net) · [teams.py](https://github.com/microsoft/teams.py).
