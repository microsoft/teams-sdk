<!-- samples -->

- **[Build an agent in Teams](./build-agent)** — create an agent with [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/), add a local clarification tool and remote MCP tool servers, stream responses into Teams, and preserve conversation history across turns.
- **[Enhancing the Teams Experience](./teams-enhancements)** — build on the base integration with richer conversational features: clarification cards, suggested follow-up prompts, inline citations, and structured feedback handling.
- **[Exposing Teams to AI Agents (MCP)](./mcp-server)** — turn your bot into an [MCP](https://modelcontextprotocol.io/introduction) server so external agents can reach real users through Teams chat with tools like `find_user`, `notify`, `ask`, and `request_approval`. Useful for human-in-the-loop workflows.
- **[Bot-to-Bot with A2A](./a2a)** — two Teams bots, each backed by its own agent, hand users off to each other over the [Agent2Agent](https://a2a-protocol.org/) protocol, opening a proactive chat with the user so the conversation continues seamlessly.

All samples are available in the [`microsoft/teams.py` examples](https://github.com/microsoft/teams.py/tree/main/examples).
