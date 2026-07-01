<!-- intro -->

The setup uses the official [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) (`McpServer`) over a streamable-HTTP transport, mounted onto the same Express app that hosts the Teams bot.

Full source: [examples/mcp-server](https://github.com/microsoft/teams.ts/tree/main/examples/mcp-server).

<!-- define-tool -->

Tools are registered on an `McpServer`. The sample wraps `registerTool` in a small `structuredTool` helper so handlers can return a plain typed value that's serialized to MCP's structured-content shape. Input and output schemas are described with [Zod](https://zod.dev/).

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const mcpServer = new McpServer({ name: 'teams-bot', version: '0.0.0' });

mcpServer.registerTool(
  'echo',
  {
    description: 'Echo back whatever was sent.',
    inputSchema: { message: z.string() },
    outputSchema: z.object({ echoed: z.string() }),
  },
  async ({ message }) => ({
    structuredContent: { echoed: message },
    content: [{ type: 'text', text: message }],
  })
);
```

<!-- find-user -->

```typescript
import * as endpoints from '@microsoft/teams.graph-endpoints';

structuredTool(
  'find_user',
  {
    description:
      'Find users in this tenant by partial name, email, or UPN. Returns up to 5 matches ' +
      'with their AAD object ids — pass an id to notify, ask, or request_approval.',
    inputSchema: { query: z.string().describe('Name, email, or UPN fragment to search for.') },
    outputSchema: z.object({
      matches: z.array(
        z.object({ id: z.string(), displayName: z.string().nullable(), userPrincipalName: z.string().nullable() })
      ),
    }),
  },
  async ({ query }) => {
    const result = await app.graph.call(endpoints.users.list, {
      ConsistencyLevel: 'eventual',
      $search: `"displayName:${query}" OR "userPrincipalName:${query}"`,
      $select: ['id', 'displayName', 'userPrincipalName'],
      $top: 5,
    });
    const matches = (result.value ?? []).map((u) => ({
      id: u.id!,
      displayName: u.displayName ?? null,
      userPrincipalName: u.userPrincipalName ?? null,
    }));
    return { matches };
  }
);
```

`app.graph` calls Microsoft Graph as the bot's app identity — no extra credentials beyond `CLIENT_ID` / `CLIENT_SECRET` / `TENANT_ID`.

<!-- notify -->

```typescript
structuredTool(
  'notify',
  {
    description: 'Send a notification to a Teams user. No response expected.',
    inputSchema: {
      userId: z.string().describe('The AAD object id of the Teams user to notify.'),
      message: z.string().describe('The message text to send.'),
    },
    outputSchema: z.object({ notified: z.boolean(), userId: z.string() }),
  },
  async ({ userId, message }) => {
    const conversationId = await getOrCreateConversation(userId);
    await app.send(conversationId, message);
    return { notified: true, userId };
  }
);
```

`getOrCreateConversation` returns the cached 1:1 conversation id for the user, or opens one proactively via `app.api.conversations.create({ members, tenantId })` if the user hasn't messaged the bot yet.

<!-- ask -->

```typescript
structuredTool(
  'ask',
  {
    description:
      'Ask a Teams user a question via an Adaptive Card with a reply box. Returns a requestId — ' +
      'call wait_for_reply with it to get the answer.',
    inputSchema: {
      userId: z.string().describe('The AAD object id of the Teams user to ask.'),
      question: z.string().describe('The question to ask.'),
    },
    outputSchema: z.object({ requestId: z.string() }),
  },
  async ({ userId, question }) => {
    const conversationId = await getOrCreateConversation(userId);
    const requestId = randomUUID();
    const card = new AdaptiveCard(
      new TextBlock(question, { weight: 'Bolder', size: 'Medium', wrap: true }),
      new TextInput().withId('reply').withPlaceholder('Type your reply...').withIsMultiline(true).withIsRequired(true)
    ).withActions(
      new ExecuteAction({ title: 'Send' })
        .withData(new SubmitData('ask_reply', { request_id: requestId }))
        .withAssociatedInputs('auto')
    );
    // Record the pending ask BEFORE sending so a fast reply is never lost.
    state.pendingAsks.set(requestId, { userId, status: 'pending', event: makeEvent() });
    await app.send(conversationId, card);
    return { requestId };
  }
);

structuredTool(
  'wait_for_reply',
  {
    description: "Wait for the user's reply to an earlier ask. Blocks up to timeoutSeconds (default 30).",
    inputSchema: {
      requestId: z.string(),
      timeoutSeconds: z.number().optional().default(30),
    },
    outputSchema: z.object({ status: z.enum(['pending', 'answered']), reply: z.string().nullable() }),
  },
  async ({ requestId, timeoutSeconds }) => {
    const entry = state.pendingAsks.get(requestId);
    if (!entry) throw new Error(`No ask found with requestId ${requestId}.`);
    if (entry.status !== 'pending') return { status: entry.status, reply: entry.reply ?? null };

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      entry.event.promise,
      new Promise<void>((resolve) => { timeoutHandle = setTimeout(resolve, (timeoutSeconds ?? 30) * 1000); }),
    ]);
    clearTimeout(timeoutHandle);
    return { status: entry.status, reply: entry.reply ?? null };
  }
);
```

`makeEvent()` is a minimal promise resolved exactly once. `wait_for_reply` races it against a timeout and returns the moment the user submits, or `status: 'pending'` if the timeout fires first.

<!-- ask-handler -->

```typescript
app.on('card.action.ask_reply', async ({ activity }) => {
  const { request_id: requestId, reply } = activity.value.action.data as { request_id?: string; reply?: string };
  const entry = requestId ? state.pendingAsks.get(requestId) : undefined;
  if (entry?.status === 'pending') {
    entry.status = 'answered';
    entry.reply = reply ?? '';
    entry.event.set(); // wake wait_for_reply
    return {
      statusCode: 200,
      type: 'application/vnd.microsoft.card.adaptive',
      value: new AdaptiveCard(new TextBlock('Reply recorded', { weight: 'Bolder', color: 'Good' })),
    } satisfies AdaptiveCardActionCardResponse;
  }
  return {
    statusCode: 200,
    type: 'application/vnd.microsoft.activity.message',
    value: 'Unable to record reply. The ask may be invalid or expired.',
  } satisfies AdaptiveCardActionMessageResponse;
});
```

<!-- approval -->

```typescript
structuredTool(
  'request_approval',
  {
    description: 'Send an approval request to a Teams user. Returns an approvalId.',
    inputSchema: {
      userId: z.string(),
      title: z.string(),
      description: z.string(),
    },
    outputSchema: z.object({ approvalId: z.string() }),
  },
  async ({ userId, title, description }) => {
    const conversationId = await getOrCreateConversation(userId);
    const approvalId = randomUUID();
    const card = new AdaptiveCard(
      new TextBlock(title, { weight: 'Bolder', size: 'Large', wrap: true }),
      new TextBlock(description, { wrap: true })
    ).withActions(
      new ExecuteAction({ title: 'Approve' }).withData(
        new SubmitData('approval_response', { approval_id: approvalId, decision: 'approved' })),
      new ExecuteAction({ title: 'Reject' }).withData(
        new SubmitData('approval_response', { approval_id: approvalId, decision: 'rejected' }))
    );
    state.pendingApprovals.set(approvalId, { userId, status: 'pending', event: makeEvent() });
    await app.send(conversationId, card);
    return { approvalId };
  }
);

structuredTool(
  'wait_for_approval',
  {
    description:
      "Wait for an approval decision. Blocks up to timeoutSeconds (default 30). " +
      "Returns 'approved' or 'rejected' when the user clicks, or 'pending' if the timeout fires.",
    inputSchema: {
      approvalId: z.string(),
      timeoutSeconds: z.number().optional().default(30),
    },
    outputSchema: z.object({
      approvalId: z.string(),
      status: z.enum(['pending', 'approved', 'rejected']),
    }),
  },
  async ({ approvalId, timeoutSeconds }) => {
    const approval = state.pendingApprovals.get(approvalId);
    if (!approval) throw new Error(`No approval found with approvalId ${approvalId}.`);
    if (approval.status !== 'pending') return { approvalId, status: approval.status };

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      approval.event.promise,
      new Promise<void>((resolve) => { timeoutHandle = setTimeout(resolve, (timeoutSeconds ?? 30) * 1000); }),
    ]);
    clearTimeout(timeoutHandle);
    return { approvalId, status: approval.status };
  }
);
```

`wait_for_approval` mirrors `wait_for_reply` — it parks on the approval's event and returns the decision the moment the user clicks, or `'pending'` on timeout.

<!-- approval-handler -->

```typescript
app.on('card.action.approval_response', async ({ activity }) => {
  const { approval_id: approvalId, decision } = activity.value.action.data as {
    approval_id?: string;
    decision?: string;
  };
  const approval = approvalId ? state.pendingApprovals.get(approvalId) : undefined;
  if (approval?.status === 'pending' && (decision === 'approved' || decision === 'rejected')) {
    approval.status = decision;
    approval.event.set(); // wake wait_for_approval
    const label = decision === 'approved' ? 'Approved ✅' : 'Rejected ❌';
    const color = decision === 'approved' ? 'Good' : 'Attention';
    return {
      statusCode: 200,
      type: 'application/vnd.microsoft.card.adaptive',
      value: new AdaptiveCard(new TextBlock(label, { weight: 'Bolder', color })),
    } satisfies AdaptiveCardActionCardResponse;
  }
  return {
    statusCode: 200,
    type: 'application/vnd.microsoft.activity.message',
    value: 'Unable to record response. The approval request may be invalid or expired.',
  } satisfies AdaptiveCardActionMessageResponse;
});
```

<!-- wiring -->

Initialize the Teams app first (its plugins register `/api/messages` on the Express app), then mount the MCP transport at `/mcp`. The MCP SDK binds one server per client session, so spin up a transport + `McpServer` per `Mcp-Session-Id`.

```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

await app.initialize();

const transports = new Map<string, StreamableHTTPServerTransport>();

expressApp.post('/mcp', express.json(), async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport && isInitializeRequest(req.body)) {
    // New client: one transport + server per session.
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => transports.set(id, transport!),
    });
    await createMcpServer().connect(transport);
  }
  await transport!.handleRequest(req, res, req.body);
});

const server = http.createServer(expressApp);
server.listen(Number(process.env.PORT) || 3978);
```
