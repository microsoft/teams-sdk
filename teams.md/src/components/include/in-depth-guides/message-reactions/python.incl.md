<!-- adding-reaction -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    await ctx.send("Hello! I'll react to your message.")

    # Add a reaction to the incoming message
    await ctx.api.reactions.add(
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
    await ctx.api.reactions.add(
        ctx.activity.conversation.id,
        ctx.activity.id,
        'heart'
    )

    # Wait a bit, then remove it
    await asyncio.sleep(2)
    await ctx.api.reactions.delete(
        ctx.activity.conversation.id,
        ctx.activity.id,
        'heart'
    )
```

<!-- reaction-types -->

- `'like'` — 👍
- `'heart'` — ❤️
- `'1f440_eyes'` — 👀
- `'2705_whiteheavycheckmark'` — ✅
- `'launch'` — 🚀
- `'1f4cc_pushpin'` — 📌

<!-- receiving-reactions -->

```python
@app.on_message_reaction
async def handle_reaction(ctx: ActivityContext[MessageReactionActivity]):
    for reaction in ctx.activity.reactions_added or []:
        print(f"User added reaction: {reaction.type}")

    for reaction in ctx.activity.reactions_removed or []:
        print(f"User removed reaction: {reaction.type}")
```
