<!-- streaming -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    async for chunk in agent.run(ctx.activity.text or "", stream=True):
        if chunk.text:
            ctx.stream.emit(chunk.text)
```

<!-- ai-label -->

`add_ai_generated()` marks the message as system-generated.

```python
reply = MessageActivityInput().add_ai_generated()
ctx.stream.emit(reply)
```

<!-- feedback -->

`add_feedback(mode="custom")` enables the thumbs up/down controls and lets you surface a custom feedback form when users respond.

```python
reply = MessageActivityInput().add_ai_generated().add_feedback(mode="custom")
ctx.stream.emit(reply)
```

<!-- clarification-cards -->

```python
async def _run_agent_and_reply(ctx, session, text: str) -> None:
    cards: list[AdaptiveCard] = []
    pending_cards.set(cards)

    full_text = ""
    async for chunk in agent.run(text, session=session, stream=True):
        if chunk.text:
            ctx.stream.emit(chunk.text)
            full_text += chunk.text

    if cards:
        # Clarification card — discard any streamed text, then emit card-only.
        ctx.stream.clear_text()
        reply = MessageActivityInput().add_ai_generated()
        for card in cards:
            reply.add_card(card)
        ctx.stream.emit(reply)
    else:
        # normal reply: attach follow-ups, citations, feedback (below).
        ...
```

The user's choice is captured by a card-action handler and fed straight back into the agent as the next turn:

```python
@app.on_card_action_execute(CLARIFICATION_VERB)
async def handle_clarification(ctx: ActivityContext[AdaptiveCardInvokeActivity]) -> AdaptiveCardInvokeResponse:
    choice = (ctx.activity.value.action.data or {}).get(CLARIFICATION_INPUT_ID, "")
    if choice:
        session = _sessions[ctx.activity.conversation.id]
        await _run_agent_and_reply(ctx, session, choice)
    return AdaptiveCardActionMessageResponse(
        status_code=200, type="application/vnd.microsoft.activity.message", value="OK",
    )
```

<!-- suggested-prompts -->

```python
import json

from microsoft_teams.api import CardAction, CardActionType, SuggestedActions

_FOLLOW_UPS_PROMPT = (
    "Based on the conversation so far, suggest exactly 2 short follow-up questions the user might want to ask next. "
    'Respond with JSON: {"followUps": ["question 1", "question 2"]}. Keep each question under 60 characters.'
)

async def _generate_follow_ups(last_user_text: str, last_ai_text: str) -> list[CardAction]:
    completion = await openai_client.chat.completions.create(
        model=getenv("AZURE_OPENAI_MODEL", ""),
        messages=[
            {"role": "user", "content": last_user_text},
            {"role": "assistant", "content": last_ai_text},
            {"role": "system", "content": _FOLLOW_UPS_PROMPT},
        ],
        response_format=_FOLLOW_UPS_SCHEMA,  # strict json_schema
    )
    data = json.loads(completion.choices[0].message.content or "{}")
    return [CardAction(type=CardActionType.IM_BACK, title=q, value=q) for q in data.get("followUps", [])[:2]]
```

Attach the generated prompts to the reply with `with_suggested_actions`:

```python
reply.with_suggested_actions(
    SuggestedActions(to=[ctx.activity.from_.id], actions=follow_ups)
)
```

The follow-up call runs separately from the main agent, so any parse or network failure silently degrades to no chips while the main reply still ships.

<!-- citations -->

```python
import re

from microsoft_teams.api import CitationAppearance

def _attach_citations(reply: MessageActivityInput, full_text: str) -> None:
    used_positions = {int(n) for n in re.findall(r"\[(\d+)\]", full_text)}
    for annotation in tool_logger.citations.values():
        pos = annotation["position"]
        if pos in used_positions:
            reply.add_citation(
                position=pos,
                appearance=CitationAppearance(
                    name=annotation.get("title") or f"Source {pos}",
                    abstract=annotation.get("snippet") or "No description available.",
                    url=annotation.get("url"),
                ),
            )
```

`tool_logger` is the `CitationMiddleware` instance from [Build an agent](./build-agent#grounding-responses-with-citations); its `citations` dict is reset at the start of each turn.
