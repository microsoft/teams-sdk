<!-- streaming -->

```typescript
const runner = client.chat.completions.runTools({ model, messages: history, tools, stream: true });
runner.on('content', (delta: string) => stream.emit(delta));
await runner.done();
```

<!-- ai-label -->

`addAiGenerated()` marks the message as system-generated.

```typescript
const reply = new MessageActivity().addAiGenerated();
stream.emit(reply);
```

<!-- feedback -->

`addFeedback('custom')` enables the thumbs up/down controls and lets you surface a custom feedback form when users respond.

```typescript
const reply = new MessageActivity().addAiGenerated().addFeedback('custom');
stream.emit(reply);
```

<!-- clarification-cards -->

```typescript
function shipResult(result: AgentRunResult, stream: IStreamer, recipientId: string): void {
  if (result.pendingCard) {
    // Clarification card — discard any streamed text, then emit card-only.
    stream.clearText();
    stream.emit(new MessageActivity().addCard('adaptive', result.pendingCard).addAiGenerated());
    return;
  }
  // normal reply: attach follow-ups, citations, feedback (below).
}
```

The user's choice is captured by a card-action handler and fed straight back into the agent as the next turn:

```typescript
app.on('card.action.clarification', async ({ activity, stream }) => {
  const data = (activity.value.action.data ?? {}) as Record<string, unknown>;
  const choice = typeof data[CLARIFICATION_INPUT_ID] === 'string' ? (data[CLARIFICATION_INPUT_ID] as string) : '';
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
  properties: { prompt1: { type: 'string' }, prompt2: { type: 'string' } },
  required: ['prompt1', 'prompt2'],
  additionalProperties: false,
} as const;

async function generateFollowUps(history: ChatCompletionMessageParam[]): Promise<string[]> {
  try {
    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [...history, { role: 'system', content: FOLLOW_UPS_PROMPT }],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'follow_ups', strict: true, schema: FOLLOW_UPS_SCHEMA },
      },
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    return [parsed.prompt1, parsed.prompt2].filter((s): s is string => typeof s === 'string' && s.length > 0);
  } catch {
    return []; // degrade silently — the main reply still ships
  }
}
```

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
attachCitations(activity: MessageActivity, fullText: string): number {
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
const finalMarker = new MessageActivity().addAiGenerated().addFeedback('custom');
result.citations.attachCitations(finalMarker, result.fullText);
if (result.followUps.length > 0) {
  finalMarker.withSuggestedActions({
    to: [recipientId],
    actions: result.followUps.map((p) => ({ type: 'imBack', title: p, value: p })),
  });
}
stream.emit(finalMarker);
```
