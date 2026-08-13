<!-- prerequisites -->

- Node.js 20 or later
- The [Teams Developer CLI](/cli/)
- A development tunnel with a public HTTPS URL
- A Teams bot registration
- Either an Azure OpenAI deployment or an Anthropic API key

<!-- get-sample -->

```bash
git clone https://github.com/microsoft/teams.ts.git
cd teams.ts
npm install
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

<!-- run-sample -->

```bash
npm run dev --workspace=@examples/ai-mcp
```

Expected startup output includes:

```text
Connected to MCP server https://learn.microsoft.com/api/mcp; discovered 3 tools.
listening on port 3978
```

<!-- provider-config -->

:::note[Anthropic SDK choice]
This sample uses Anthropic's TypeScript **Messages SDK**. The Claude Agent SDK is a separate higher-level runtime and is not required for this integration.
:::

<Tabs groupId="ai-provider">
  <TabItem value="azure-openai" label="Azure OpenAI" default>

```env
AI_PROVIDER=azure-openai
AZURE_OPENAI_ENDPOINT=https://<resource-name>.openai.azure.com
AZURE_OPENAI_API_KEY=<api-key>
AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=<deployment-name>
AZURE_OPENAI_API_VERSION=2024-10-21
```

`AZURE_OPENAI_MODEL_DEPLOYMENT_NAME` is the deployment name configured on your Azure resource.

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

Keep API keys on the server. Both providers use the public Microsoft Learn MCP server by default.

<!-- provider-boundary -->

The Teams handlers depend on one provider-neutral contract:

```typescript
export interface IAgentRunner {
  run(conversationId: string, userText: string, stream: IStreamer): Promise<AgentRunResult>;
}
```

The message and card-action handlers know only about this interface:

```typescript
const result = await agent.run(activity.conversation.id, userText, stream);
shipResult(result, stream, activity.from.id);
```

Provider selection happens once during startup. Each implementation receives the same MCP tools and logger.

<Tabs groupId="ai-provider">
  <TabItem value="azure-openai" label="Azure OpenAI">

```typescript
const deployment = required('AZURE_OPENAI_MODEL_DEPLOYMENT_NAME');
const agent: IAgentRunner = new Agent({
  client: new AzureOpenAI({
    endpoint: required('AZURE_OPENAI_ENDPOINT'),
    apiKey: required('AZURE_OPENAI_API_KEY'),
    deployment,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
  }),
  deploymentName: deployment,
  mcpTools,
  log,
});
```

The implementation uses `chat.completions.runTools()` to stream text and execute tools.

  </TabItem>
  <TabItem value="anthropic" label="Anthropic Claude">

```typescript
const agent: IAgentRunner = new AnthropicAgent({
  client: new Anthropic({
    apiKey: required('ANTHROPIC_API_KEY'),
  }),
  model: required('ANTHROPIC_MODEL'),
  mcpTools,
  log,
});
```

The implementation uses `messages.stream()`, executes returned `tool_use` blocks, appends matching `tool_result` blocks, and continues until Claude returns final text.

  </TabItem>
</Tabs>

<!-- sample-link -->

Browse the complete [`ai-mcp` sample](https://github.com/microsoft/teams.ts/tree/main/examples/ai-mcp).
