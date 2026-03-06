<!-- basic-message-example -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    await ctx.send(f"You said '{ctx.activity.text}'")
```

<!-- signin-example -->

```python
@app.event("sign_in")
async def handle_sign_in(event: SignInEvent):
    """Handle sign-in events."""
    await event.activity_ctx.send("You are now signed in!")
```

<!-- signin-event-name -->

`sign_in`

<!-- streaming-example -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    ctx.stream.update("Stream starting...")
    await asyncio.sleep(1)

    # Stream messages with delays using ctx.stream.emit
    for message in STREAM_MESSAGES:
        # Add some randomness to timing
        await asyncio.sleep(random())

        ctx.stream.emit(message)
```

<!-- mention-method-name -->

`add_mention`

<!-- mention-example -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
  await ctx.send(MessageActivityInput(text='hi!').add_mention(account=ctx.activity.from_))
```

<!-- targeted-method-name -->

`with_recipient`

<!-- targeted-send-example -->

```python
from microsoft_teams.api import MessageActivity, MessageActivityInput
from microsoft_teams.apps import ActivityContext

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    # Using with_recipient with is_targeted=True explicitly targets the specified recipient
    await ctx.send(
        MessageActivityInput(text="This message is only visible to you!")
            .with_recipient(ctx.activity.from_, is_targeted=True)
    )
```

<!-- targeted-preview-note -->

:::tip[Python]
Preview APIs emit an `ExperimentalWarning` at runtime. To suppress it:

```python
import warnings
from microsoft_teams.common.experimental import ExperimentalWarning

warnings.filterwarnings("ignore", category=ExperimentalWarning)
```
:::

<!-- reactions-preview-note -->

:::tip[Python]
Preview APIs emit an `ExperimentalWarning` at runtime. To suppress it:

```python
import warnings
from microsoft_teams.common.experimental import ExperimentalWarning

warnings.filterwarnings("ignore", category=ExperimentalWarning)
```
:::
