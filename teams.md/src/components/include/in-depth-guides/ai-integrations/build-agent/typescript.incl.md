<!-- intro -->

This guide uses the multi-provider [`ai-mcp` sample](https://github.com/microsoft/teams.ts/tree/main/examples/ai-mcp). Azure OpenAI and Anthropic Claude share the same Teams handlers, MCP connection, local tools, citations, cards, and feedback. Only the provider implementation owns model-specific messages and tool-loop behavior.

Set `AI_PROVIDER=azure-openai` or `AI_PROVIDER=anthropic`. The rest of the Teams application remains unchanged.

<!-- define-agent -->

The handlers depend on a small provider-neutral contract:

```typescript
export interface IAgentRunner {
  run(conversationId: string, userText: string, stream: IStreamer): Promise<AgentRunResult>;
}
```

Create the implementation that matches your configured provider:

<Tabs groupId="ai-provider">
  <TabItem value="azure-openai" label="Azure OpenAI">

```typescript
import { AzureOpenAI } from 'openai';

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

  </TabItem>
  <TabItem value="anthropic" label="Anthropic Claude">

```typescript
import Anthropic from '@anthropic-ai/sdk';

const agent: IAgentRunner = new AnthropicAgent({
  client: new Anthropic({
    apiKey: required('ANTHROPIC_API_KEY'),
  }),
  model: required('ANTHROPIC_MODEL'),
  mcpTools,
  log,
});
```

  </TabItem>
</Tabs>

<!-- local-tool -->

Keep tool behavior independent of the model provider. The clarification tool validates its input, creates the card, and returns text that can be sent back to either model:

```typescript
export const CLARIFICATION_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    options: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['question', 'options'],
  additionalProperties: false,
};

async function executeClarificationTool(
  input: unknown,
  pendingCards: AdaptiveCard[]
): Promise<string> {
  if (!isClarificationArgs(input)) {
    throw new Error('request_clarification requires a question and 2-4 options.');
  }
  pendingCards.push(buildClarificationCard(input));
  return 'Clarification card attached.';
}

function isClarificationArgs(value: unknown): value is ClarificationArgs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.question === 'string' &&
    Array.isArray(input.options) &&
    input.options.length >= 2 &&
    input.options.length <= 4 &&
    input.options.every((option) => typeof option === 'string')
  );
}
```

Adapt the same schema at the provider boundary:

<Tabs groupId="ai-provider">
  <TabItem value="azure-openai" label="Azure OpenAI">

```typescript
const tool: RunnableToolFunction<ClarificationArgs> = {
  type: 'function',
  function: {
    name: 'request_clarification',
    description: 'Ask the user to clarify an ambiguous request.',
    parameters: CLARIFICATION_TOOL_SCHEMA,
    function: (input) => executeClarificationTool(input, pendingCards),
    parse: (raw) => JSON.parse(raw) as ClarificationArgs,
  },
};
```

  </TabItem>
  <TabItem value="anthropic" label="Anthropic Claude">

```typescript
const tool: Anthropic.Tool = {
  name: 'request_clarification',
  description: 'Ask the user to clarify an ambiguous request.',
  input_schema: {
    ...CLARIFICATION_TOOL_SCHEMA,
    type: 'object',
  },
};
```

When Claude returns this tool name, call `executeClarificationTool(toolUse.input, pendingCards)`. The runtime guard validates Anthropic's `unknown` input before the card is built.

  </TabItem>
</Tabs>

<!-- mcp-tools -->

Connect to the MCP server once, retain its provider-neutral definitions, and centralize execution:

```typescript
const client = new Client({ name: 'ai-mcp-sample', version: '0.0.0' });
await client.connect(
  new StreamableHTTPClientTransport(new URL('https://learn.microsoft.com/api/mcp'))
);

const listed = await client.listTools();
const tools = listed.tools.map((tool) => ({
  name: tool.name,
  description: tool.description ?? '',
  parameters: tool.inputSchema,
}));

async function executeMcpTool(name: string, input: Record<string, unknown>): Promise<string> {
  const result = await client.callTool({ name, arguments: input });
  const text = stringifyResult(result.content);
  citations.tryExtract(text);
  return text;
}
```

For Azure OpenAI, expose each schema as `function.parameters`. For Anthropic, expose it as `input_schema`. Both adapters call the same `executeMcpTool` function.

<!-- running -->

The Teams handler is identical for both providers:

```typescript
app.on('message', async ({ activity, stream }) => {
  const userText = activity.stripMentionsText().text ?? '';
  const result = await agent.run(activity.conversation.id, userText, stream);
  shipResult(result, stream, activity.from.id);
});
```

Each provider calls `stream.emit(delta)` as text arrives. The handler receives a common `AgentRunResult` containing final text, citations, follow-up prompts, and any pending clarification card.

<!-- memory -->

Each provider keeps its native message format in a per-conversation map and serializes concurrent turns for the same conversation.

<Tabs groupId="ai-provider">
  <TabItem value="azure-openai" label="Azure OpenAI">

```typescript
const histories = new Map<string, ChatCompletionMessageParam[]>();

const runner = client.chat.completions.runTools({
  model: deployment,
  messages: history,
  tools,
  stream: true,
});
runner.on('content', (delta) => stream.emit(delta));
await runner.done();
history.splice(0, history.length, ...runner.messages);
```

`runTools()` appends assistant tool calls and tool results while it executes the loop.

  </TabItem>
  <TabItem value="anthropic" label="Anthropic Claude">

```typescript
const histories = new Map<string, Anthropic.MessageParam[]>();

const modelStream = client.messages
  .stream({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: history,
    tools,
  })
  .on('text', (delta) => stream.emit(delta));

const response = await modelStream.finalMessage();
history.push({ role: 'assistant', content: toAssistantContent(response.content) });
```

If the response contains `tool_use` blocks, execute them, append matching `tool_result` blocks as a user message, and call `messages.stream()` again. Stop when the response contains no client tool calls.

  </TabItem>
</Tabs>

<!-- citations -->

The extraction lives in a small `CitationCollector`. Every MCP execution feeds its raw result into `tryExtract`, which parses search payloads and assigns each source a stable 1-based position.

```typescript
type CitationEntry = {
  position: number;
  url: string;
  title: string;
  snippet: string;
};

export class CitationCollector {
  private readonly entries = new Map<string, CitationEntry>();

  tryExtract(result: string): void {
    let doc: unknown;
    try {
      doc = JSON.parse(result);
    } catch {
      return;
    }

    for (const item of findResults(doc) ?? []) {
      const url = item.contentUrl ?? item.link;
      if (!url || this.entries.has(url)) continue;
      this.entries.set(url, {
        position: this.entries.size + 1,
        url,
        title: item.title ?? '',
        snippet: (item.content ?? item.description ?? '').slice(0, 160),
      });
    }
  }
}
```

The collected entries are attached to the final reply in [Enhancing the Teams Experience](./teams-enhancements#citations).
