<!-- adding-reaction -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    await ctx.send("Hello! I'll react to this message.")

    # Add a reaction to the incoming message
    await ctx.api.conversations.reactions.add(
        ctx.activity.conversation.id,
        ctx.activity.id,
        'like'
    )
```

<!-- removing-reaction -->

```python
import asyncio

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    # First, add a reaction
    await ctx.api.conversations.reactions.add(
        ctx.activity.conversation.id,
        ctx.activity.id,
        'heart'
    )

    # Wait a bit, then remove it
    await asyncio.sleep(2)
    await ctx.api.conversations.reactions.delete(
        ctx.activity.conversation.id,
        ctx.activity.id,
        'heart'
    )
```

<!-- reaction-types -->

The following reaction types are available:

- `'like'` — 👍
- `'heart'` — ❤️
- `'checkmark'` — ✅
- `'hourglass'` — ⏳
- `'pushpin'` — 📌
- `'exclamation'` — ❗
- `'laugh'` — 😆
- `'surprise'` — 😮
- `'sad'` — 🙁
- `'angry'` — 😠

You can also use custom emoji reactions by providing the emoji code:

```python
# Use a custom emoji reaction
await ctx.api.conversations.reactions.add(
    ctx.activity.conversation.id,
    ctx.activity.id,
    '1f44b_wavinghand-tone4'
)
```

<!-- advanced-usage -->

For advanced scenarios, you can access the API client from the context:

```python
# The API client is available through the context
api = ctx.api

# Use reactions API
await api.conversations.reactions.add(
    conversation_id,
    activity_id,
    'like'
)
```
