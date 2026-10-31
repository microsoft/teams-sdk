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

You are not restricted to only replying to `message` activities. In the above example, the handler is listening to `sign_in` events, which are sent when a user successfully signs in.

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

<!-- streaming-pacing-details -->

`ctx.stream.emit()` is fire and forget. It appends to a queue and returns immediately instead of awaiting the network, and a flush then drains the whole queue into one accumulated buffer and sends it as a single typing activity. When further chunks arrive while a send is already in flight, the next flush is scheduled 0.5s later, which is what collapses a fast loop into roughly two sends per second. Chunks that arrive slower than a round trip are sent as they come, so the SDK never adds latency to a slow producer.

Failed sends of streamed chunks are retried for you with exponential backoff: up to 8 attempts, waiting 0.5s, 1s, 2s, and then 4s for each remaining attempt. The final send from `ctx.stream.close()` uses the library defaults instead, up to 5 attempts with full jitter, so each of those waits is a random value up to the same doubling 0.5s, 1s, 2s, 4s bounds rather than the bound itself. Both are blind retries on transient failures rather than rate limit aware backoff, since the SDK does not read `Retry-After` or treat `429` specially. Terminal `403`s are deliberately excluded, so a stream that has already timed out or been cancelled is never retried back to life.

<!-- streaming-handoff-example -->

```python
import time

from microsoft_teams.api import MessageActivity, MessageActivityInput
from microsoft_teams.apps import ActivityContext

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    opened: float | None = None
    text = ""
    editing = False
    message_id: str | None = None
    last_edit = 0.0

    async for chunk in run_agent(ctx.activity.text):
        text += chunk

        # Phase 1: real streaming. The window opens on the first streamed chunk,
        # not when the handler starts, so the clock starts here.
        if not editing and (opened is None or time.monotonic() - opened < 110):
            if opened is None:
                opened = time.monotonic()
            ctx.stream.emit(chunk)
            continue

        # Hand off once, keeping the finalized message's id.
        if not editing:
            sent = await ctx.stream.close()
            message_id = sent.id if sent else None
            editing = True

        # Phase 2: plain edits on the same message. No two minute ceiling.
        if message_id and time.monotonic() - last_edit > 3:
            await ctx.send(MessageActivityInput(text=text).with_id(message_id))
            last_edit = time.monotonic()

    if not editing:
        await ctx.stream.close()
    elif message_id:
        await ctx.send(MessageActivityInput(text=text).with_id(message_id))
    else:
        # close() published nothing, so send the buffered text rather than drop it.
        await ctx.send(MessageActivityInput(text=text))
```

Setting an id on an outgoing activity routes the send through the update path, so each edit replaces the finalized message instead of posting a new one.

<!-- streaming-informative-and-cancel -->

`ctx.stream.update()` sends an informative update.
An update emitted after response text has accumulated is ignored.
The SDK learns that the user stopped the stream from the answer to a chunk it sends.
From then on `ctx.stream.canceled` is true and `ctx.stream.emit()` raises `StreamCancelledError`.
A stream creates its message from response text or an informative update.
If the first output is only attachments, `ctx.stream.close()` creates no message, so send the attachments with `ctx.send()` instead.

<!-- streaming-threading-options -->

`ctx.stream` is created with this placement already applied.
To create an `HttpStream` yourself, pass `StreamOptions(StreamReplyChain(chat_or_channel_id, reply_chain_id))` as its `options`.
Both types are experimental.

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

<!-- prompt-preview-proactive-example -->

```python
from microsoft_teams.api import Account, MessageActivityInput

targeted_message_id = "1772050244572"
conversation_id = "19:groupchat-id@thread.v2"
user_account = Account(id="29:1AbCDef...", name="Adele Vance")

targeted_message = MessageActivityInput(text="Here is the result!")
targeted_message.add_targeted_message_info(targeted_message_id)
targeted_message.with_recipient(user_account, is_targeted=True)

# Targeted reply (only the user sees it)
await app.send(conversation_id, targeted_message)

# OR public reply (everyone sees it)
public_message = MessageActivityInput(text="Here is the result!")
public_message.add_targeted_message_info(targeted_message_id)
await app.send(conversation_id, public_message)
```

<!-- context-send-method-name -->

`send()`

<!-- context-reply-method-name -->

`reply()`

<!-- threading-reactive-example -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    # Send reactively without quoting.
    # In a channel, sends in the same thread.
    # In a 1:1 chat, matches the level of the inbound message.
    await ctx.send("Acknowledged")

    # Send a reactive, quoted reply.
    # In a channel, sends in the same thread.
    # In a 1:1 chat, matches the level of the inbound message.
    await ctx.reply("Got it!")
```

<!-- threading-experimental-note -->

The reply chain types and operations are marked with `Diagnostic: ExperimentalTeamsThreading` in their docstrings.
The marker is documentation only for the types, with no runtime warning.
The two client methods `create_reply_chain_activity` and `create_targeted_reply_chain_activity` are also decorated with `@experimental`, so calling them directly emits an `ExperimentalWarning`.
The marker covers `channel_data.chat` and `channel_data.reply_chain`, those two methods, `StreamOptions` and `StreamReplyChain`.
`send`, `reply` and `app.reply` are not marked and do not warn.

<!-- reactions-preview-note -->
N/A

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
    parent_message_id = "1772050244572"
    await ctx.quote(parent_message_id, "Referencing an earlier message")
```

<!-- quoted-replies-builder-example -->

```python
from microsoft_teams.api.activities.message import MessageActivityInput

parent_message_id = "1772050244572"
first_message_id = "1772050244573"
second_message_id = "1772050244574"

# Single quote with response below it
msg = (MessageActivityInput()
    .add_quote(parent_message_id, "Here is my response"))
await app.send(conversation_id, msg)

# Multiple quotes with interleaved responses
msg = (MessageActivityInput()
    .add_quote(first_message_id, "response to first")
    .add_quote(second_message_id, "response to second"))
await app.send(conversation_id, msg)

# Grouped quotes — omit response to group quotes together
msg = (MessageActivityInput(text="see below for previous messages")
    .add_quote(first_message_id)
    .add_quote(second_message_id, "response to both"))
await app.send(conversation_id, msg)
```

<!-- quoted-replies-preview-note -->
N/A
