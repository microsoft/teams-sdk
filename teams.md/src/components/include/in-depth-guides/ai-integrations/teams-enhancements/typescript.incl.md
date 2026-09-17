<!-- streaming -->

```typescript
app.on('message', async ({ activity, stream }) => {
  const userText = activity.stripMentionsText().text ?? '';
  const result = await agent.run(activity.conversation.id, userText, stream);
  shipResult(result, stream, activity.from.id);
});
```

The selected provider implementation emits text chunks through the same `IStreamer`.

<!-- ai-label -->

`addAiGenerated()` marks the message as system-generated.

```typescript
const reply = new MessageActivityInput().addAiGenerated();
stream.emit(reply);
```

<!-- feedback -->

`addFeedback('custom')` enables the thumbs up/down controls and lets you surface a custom feedback form when users respond.

```typescript
const reply = new MessageActivityInput().addAiGenerated().addFeedback('custom');
stream.emit(reply);
```

<!-- clarification-cards -->

```typescript
function shipResult(result: AgentRunResult, stream: IStreamer, recipientId: string): void {
  if (result.pendingCard) {
    // Clarification card — discard any streamed text, then emit card-only.
    stream.clearText();
    stream.emit(
      new MessageActivityInput().addCard('adaptive', result.pendingCard).addAiGenerated()
    );
    return;
  }
  // normal reply: attach follow-ups, citations, feedback (below).
}
```

The user's choice is captured by a card-action handler and fed straight back into the agent as the next turn:

```typescript
app.on('card.action.clarification', async ({ activity, stream }) => {
  const data = (activity.value.action.data ?? {}) as Record<string, unknown>;
  const choice =
    typeof data[CLARIFICATION_INPUT_ID] === 'string'
      ? (data[CLARIFICATION_INPUT_ID] as string)
      : '';
  if (choice) {
    const result = await agent.run(activity.conversation.id, choice, stream);
    shipResult(result, stream, activity.from.id);
  }
  return { statusCode: 200, type: 'application/vnd.microsoft.activity.message', value: 'OK' };
});
```

<!-- suggested-prompts -->

```typescript
const FOLLOW_UPS_PROMPT =
  'Produce 2 specific prompts the user might want to ask next, based on the conversation so far. ' +
  'Each must be phrased in the first person and stay under 8 words.';

const FOLLOW_UPS_SCHEMA = {
  type: 'object',
  properties: {
    prompt1: { type: 'string' },
    prompt2: { type: 'string' },
  },
  required: ['prompt1', 'prompt2'],
  additionalProperties: false,
} as const;

function parseFollowUps(raw: string): string[] {
  const parsed = JSON.parse(raw) as {
    prompt1?: unknown;
    prompt2?: unknown;
  };
  return [parsed.prompt1, parsed.prompt2].filter(
    (prompt): prompt is string => typeof prompt === 'string' && prompt.length > 0
  );
}
```

<Tabs groupId="ai-provider">
  <TabItem value="azure-openai" label="Azure OpenAI">

```typescript
async function generateFollowUps(history: ChatCompletionMessageParam[]): Promise<string[]> {
  try {
    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [...history, { role: 'system', content: FOLLOW_UPS_PROMPT }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'follow_ups',
          strict: true,
          schema: FOLLOW_UPS_SCHEMA,
        },
      },
    });
    return parseFollowUps(completion.choices[0]?.message?.content ?? '{}');
  } catch (error) {
    log.warn(`Follow-up generation failed: ${String(error)}`);
    return [];
  }
}
```

  </TabItem>
  <TabItem value="anthropic" label="Anthropic Claude">

```typescript
async function generateFollowUps(history: Anthropic.MessageParam[]): Promise<string[]> {
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 200,
      system: 'Return valid JSON only with string properties "prompt1" and "prompt2".',
      messages: [...history, { role: 'user', content: FOLLOW_UPS_PROMPT }],
    });
    const raw = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    return parseFollowUps(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
  } catch (error) {
    log.warn(`Follow-up generation failed: ${String(error)}`);
    return [];
  }
}
```

  </TabItem>
</Tabs>

Treat follow-up generation as optional. If parsing or the extra model call fails, return an empty array so the main response still ships.

Attach the generated prompts to the reply with `withSuggestedActions`:

```typescript
finalMarker.withSuggestedActions({
  to: [recipientId],
  actions: followUps.map((prompt) => ({ type: 'imBack', title: prompt, value: prompt })),
});
```

<!-- citations -->

Use the `CitationCollector` from [Build an agent](./build-agent#grounding-responses-with-citations). `attachCitations` reads the `[N]` markers out of the streamed text and writes a citation entity onto the final activity for each one it has data for.

```typescript
attachCitations(activity: MessageActivityInput, fullText: string): number {
  const used = new Set<number>();
  for (const match of fullText.matchAll(/\[(\d+)\]/g)) used.add(Number(match[1]));

  let attached = 0;
  for (const entry of this.entries.values()) {
    if (!used.has(entry.position)) continue;
    activity.addCitation(entry.position, {
      name: entry.title || `Source ${entry.position}`,
      abstract: entry.snippet || 'No description available.',
      url: entry.url,
    });
    attached++;
  }
  return attached;
}
```

Assemble the final marker activity with everything at once — the AI label, custom feedback, citations, and follow-up chips — then emit it so the streamer folds them into the final message:

```typescript
const finalMarker = new MessageActivityInput().addAiGenerated().addFeedback('custom');
result.citations.attachCitations(finalMarker, result.fullText);
if (result.followUps.length > 0) {
  finalMarker.withSuggestedActions({
    to: [recipientId],
    actions: result.followUps.map((p) => ({ type: 'imBack', title: p, value: p })),
  });
}
stream.emit(finalMarker);
```
