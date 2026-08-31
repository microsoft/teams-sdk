<!-- intro -->

Both bots run the **same code**, differentiated entirely by environment variables (name, description, self/peer URLs). They use [`@a2a-js/sdk`](https://www.npmjs.com/package/@a2a-js/sdk) for the protocol and the OpenAI SDK for the LLM agent.

Full source: [examples/a2a](https://github.com/microsoft/teams.ts/tree/main/examples/a2a).

<!-- agent-card -->

```typescript
import type { AgentCard } from '@a2a-js/sdk';

function buildAgentCard(config: Config): AgentCard {
  return {
    name: config.name,
    description: config.description,
    url: `${config.selfUrl.replace(/\/+$/, '')}/a2a`,
    version: '1.0.0',
    protocolVersion: '0.3.0',
    preferredTransport: 'JSONRPC',
    capabilities: {},
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['text/plain'],
    skills: [{
      id: 'handoff',
      name: 'Handoff',
      description: `Accepts handoffs of users from peer bots. Specialty: ${config.description}`,
      tags: ['a2a', 'teams', 'handoff'],
    }],
  };
}
```

<!-- message-contract -->

```typescript
export type HandoffMessage = {
  readonly kind: 'handoff';
  readonly from: string;
  readonly userName: string;
  readonly aadObjectId: string;
  readonly tenantId: string;
  readonly serviceUrl: string;
  readonly summary: string;
};

export function isHandoffMessage(value: unknown): value is HandoffMessage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.kind === 'handoff' &&
    typeof v.aadObjectId === 'string' && v.aadObjectId.length > 0 &&
    typeof v.tenantId === 'string' && v.tenantId.length > 0 &&
    typeof v.serviceUrl === 'string' && v.serviceUrl.length > 0 &&
    typeof v.summary === 'string'
  );
}
```

A type guard validates the inbound `DataPart` before the receiving bot acts on it.

<!-- handoff-tool -->

```typescript
import type { RunnableToolFunction } from 'openai/lib/RunnableFunction';

function buildHandoffTool(): RunnableToolFunction<{ summary: string }> {
  return {
    type: 'function',
    function: {
      name: 'handoff_to_peer',
      description:
        'Hand off the current user to your peer when their expertise is a better fit. ' +
        'Pass a concise summary so the peer can pick up cold. The peer will message the user directly.',
      parameters: {
        type: 'object',
        properties: { summary: { type: 'string' } },
        required: ['summary'],
        additionalProperties: false,
      },
      function: async (args: { summary: string }) => {
        const identity = TURN_STORAGE.getStore();
        if (!identity) {
          // Called from a handoff greeting (no identity) — guard against ping-pong.
          return 'handoff_to_peer is unavailable in this context.';
        }
        const payload: HandoffMessage = { kind: 'handoff', from: config.name, ...identity, summary: args.summary };
        await a2aClient.sendHandoff(payload);
        return 'Handoff confirmed. The peer will message the user directly.';
      },
      parse: (raw: string) => JSON.parse(raw) as { summary: string },
    },
  };
}
```

The identity is held in an `AsyncLocalStorage` (`TURN_STORAGE`) for the duration of the turn. The agent's system prompt embeds the peer's live `AgentCard.description` so the model knows what the peer specializes in:

```typescript
const instructions = [
  `You are ${config.name}, a Teams bot. Your specialty: ${config.description}.`,
  'You have one peer:',
  `- ${config.peerName}: ${peerDescription}`,
  `- If the user's question fits ${config.peerName}'s specialty better than your own, call handoff_to_peer with a clear summary. Then briefly tell the user you're handing them over.`,
  '- Otherwise, answer directly.',
].join('\n');
```

<!-- a2a-client -->

```typescript
import type { AgentCard, MessageSendParams } from '@a2a-js/sdk';
import { Client, ClientFactory, JsonRpcTransportFactory } from '@a2a-js/sdk/client';

export class A2APeerClient {
  private cachedClient?: Client;

  async sendHandoff(payload: HandoffMessage): Promise<void> {
    if (!this.cachedClient) await this.getPeerCard();
    const params: MessageSendParams = {
      message: {
        kind: 'message',
        role: 'user',
        messageId: crypto.randomUUID(),
        parts: [{ kind: 'data', data: payload as unknown as Record<string, unknown> }],
      },
    };
    await this.cachedClient!.sendMessage(params);
  }

  // getPeerCard() resolves the peer's AgentCard once via the well-known endpoint
  // and constructs the underlying A2A client, then caches both.
}
```

<!-- a2a-server -->

```typescript
import type { AgentExecutor, ExecutionEventBus, RequestContext } from '@a2a-js/sdk/server';
import { Client as TeamsApiClient } from '@microsoft/teams.api';

export class HandoffAgentExecutor implements AgentExecutor {
  execute = async (ctx: RequestContext, bus: ExecutionEventBus): Promise<void> => {
    const handoff = this.extractHandoff(ctx);
    if (!handoff) {
      this.publishText(bus, ctx, 'Unsupported or incomplete handoff message.');
      bus.finished();
      return;
    }
    // 1. Open a 1:1 with the user against THEIR serviceUrl.
    const newConvId = await this.openDmWithUser(handoff);
    // 2. Seed history with the handoff context + greeting.
    const greeting = await this.agent.greetWithHandoff(newConvId, handoff);
    // 3. Send the greeting proactively.
    await this.app.send(newConvId, greeting);
    // 4. Ack so the sender's sendMessage resolves.
    this.publishText(bus, ctx, `Handoff received and ${handoff.userName} contacted directly.`);
    bus.finished();
  };

  private async openDmWithUser(handoff: HandoffMessage): Promise<string> {
    const api = new TeamsApiClient(handoff.serviceUrl, this.app.api.http);
    const conv = await api.conversations.create({
      tenantId: handoff.tenantId,
      members: [{ id: handoff.aadObjectId, role: 'user', name: handoff.userName }],
    });
    if (!conv.id) throw new Error('CreateConversation returned no id.');
    return conv.id;
  }
}
```

`greetWithHandoff` runs the LLM with the handoff summary as a synthetic turn and leaves it in the per-conversation history, so subsequent user replies continue naturally.

<!-- wiring -->

```typescript
import express from 'express';
import { App, ExpressAdapter } from '@microsoft/teams.apps';
import { DefaultRequestHandler, InMemoryTaskStore } from '@a2a-js/sdk/server';
import { agentCardHandler, jsonRpcHandler, UserBuilder } from '@a2a-js/sdk/server/express';

const expressApp = express();
const app = new App({ httpServerAdapter: new ExpressAdapter(expressApp) });

const a2aHandler = new DefaultRequestHandler(
  buildAgentCard(config),
  new InMemoryTaskStore(),
  new HandoffAgentExecutor(app, agent, config, log)
);
expressApp.use('/.well-known/agent-card.json', agentCardHandler({ agentCardProvider: a2aHandler }));
expressApp.use('/a2a', jsonRpcHandler({ requestHandler: a2aHandler, userBuilder: UserBuilder.noAuthentication }));

// Register /api/messages without starting an internal server — we own the http.Server.
await app.initialize();
http.createServer(expressApp).listen(Number(process.env.PORT) || 3978);
```
