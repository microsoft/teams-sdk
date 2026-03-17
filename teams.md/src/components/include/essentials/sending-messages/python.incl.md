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
N/A

<!-- reactions-preview-note -->
N/A

<!-- get-quoted-messages-method-name -->

`get_quoted_messages()`

<!-- reply-method-name -->

`reply()`

<!-- quote-reply-method-name -->

`quote_reply()`

<!-- app-send-method-name -->

`app.send()`

<!-- add-quoted-reply-method-name -->

`add_quoted_reply()`

<!-- quoted-replies-receive-example -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    quotes = ctx.activity.get_quoted_messages()

    if quotes:
        quote = quotes[0].quoted_reply
        await ctx.reply(
            f"You quoted message {quote.message_id} from {quote.sender_name}: \"{quote.preview}\""
        )
```

<!-- quoted-replies-reply-example -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    # reply() automatically quotes the inbound message
    await ctx.reply("Got it!")
```

<!-- quoted-replies-quote-reply-example -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    # Quote a specific message by its ID
    await ctx.quote_reply("1772050244572", "Referencing an earlier message")
```

<!-- quoted-replies-builder-example -->

```python
from microsoft_teams.api.activities.message import MessageActivityInput

# Single quote with response below it
msg = (MessageActivityInput()
    .add_quoted_reply("1772050244572", "Here is my response"))
await app.send(conversation_id, msg)

# Multiple quotes with interleaved responses
msg = (MessageActivityInput()
    .add_quoted_reply("msg-1", "response to first")
    .add_quoted_reply("msg-2", "response to second"))
await app.send(conversation_id, msg)

# Grouped quotes — omit response to group quotes together
msg = (MessageActivityInput(text="see below for previous messages")
    .add_quoted_reply("msg-1")
    .add_quoted_reply("msg-2", "response to both"))
await app.send(conversation_id, msg)
```

<!-- quoted-replies-preview-note -->
N/A
