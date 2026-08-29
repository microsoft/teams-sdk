<!-- prerequisites -->

- Python 3.11 or later
- [UV](https://docs.astral.sh/uv/)
- The [Teams Developer CLI](/cli/)
- A development tunnel with a public HTTPS URL
- A Teams bot registration
- Either an Azure OpenAI deployment or an Anthropic API key

<!-- get-sample -->

```bash
git clone https://github.com/microsoft/teams.py.git
cd teams.py
uv sync --package ai-agentframework
```

The working application is in `examples/ai-mcp`.

<!-- register-app -->

```bash
npm install -g @microsoft/teams.cli
teams login
teams app create \
  --name "ai-mcp" \
  --endpoint "https://<your-tunnel>/api/messages" \
  --env examples/ai-mcp/.env \
  --json
```

The CLI writes `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` to the sample's `.env` file.

<!-- run-sample -->

```bash
cd examples/ai-mcp
uv run python src/main.py
```

<!-- provider-config -->

<Tabs groupId="ai-provider">
  <TabItem value="azure-openai" label="Azure OpenAI" default>

```env
AI_PROVIDER=azure-openai
AZURE_OPENAI_ENDPOINT=https://<resource-name>.openai.azure.com
AZURE_OPENAI_API_KEY=<api-key>
AZURE_OPENAI_MODEL=<deployment-name>
```

  </TabItem>
  <TabItem value="anthropic" label="Anthropic Claude">

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=<api-key>
ANTHROPIC_MODEL=<supported-claude-model>
ANTHROPIC_MAX_TOKENS=4096
```

  </TabItem>
</Tabs>

Keep API keys on the server. Both providers use the public Microsoft Learn MCP server.

<!-- provider-boundary -->

Microsoft Agent Framework owns the provider boundary. Startup selects a client, then constructs the same `Agent` with the same tools and middleware:

```python
provider = getenv("AI_PROVIDER", "azure-openai").strip().lower()

if provider == "anthropic":
    client = AnthropicClient(
        api_key=_require_env("ANTHROPIC_API_KEY"),
        model=_require_env("ANTHROPIC_MODEL"),
    )
elif provider == "azure-openai":
    client = OpenAIChatClient(
        model=_require_env("AZURE_OPENAI_MODEL"),
        azure_endpoint=_require_env("AZURE_OPENAI_ENDPOINT"),
        api_key=_require_env("AZURE_OPENAI_API_KEY"),
    )
else:
    raise ValueError(f"Unsupported AI_PROVIDER {provider!r}.")

agent = Agent(
    client=client,
    instructions=INSTRUCTIONS,
    tools=[*local_tools, *mcp_tools],
    middleware=[tool_logger],
)
```

The Teams handlers, `AgentSession` memory, streaming, citations, cards, feedback, and follow-up presentation remain unchanged.

<!-- sample-link -->

Browse the complete [`ai-mcp` sample](https://github.com/microsoft/teams.py/tree/main/examples/ai-mcp).
