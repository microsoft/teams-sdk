---
sidebar_position: 4
summary: Guide to sending messages from your Teams SDK agent, including replies, proactive messages, and different message types.
---

# Sending Messages

Sending messages is a core part of an agent's functionality. With all activity handlers, a `send` method is provided which allows your handlers to send a message back to the user to the relevant conversation. 

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    await ctx.send(f"You said '{ctx.activity.text}'")
```

In the above example, the handler gets a `message` activity, and uses the `send` method to send a reply to the user.

```python
@app.event("sign_in")
async def handle_sign_in(event: SignInEvent):
    """Handle sign-in events."""
    await event.activity_ctx.send("You are now signed in!")
```

You are not restricted to only replying to `message` activities. In the above example, the handler is listening to `sign_in` events, which are sent when a user successfully signs in. 

:::tip
This shows an example of sending a text message. Additionally, you are able to send back things like Adaptive Cards by using the same `send` method. Look at the [Adaptive Card](../../in-depth-guides/adaptive-cards) section for more details.
:::

## Streaming

You may also stream messages to the user which can be useful for long messages, or AI generated messages. The library makes this simple for you by providing a `stream` function which you can use to send messages in chunks. 

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

:::note
Streaming is currently only supported in 1:1 conversations, not group chats or channels
:::

![Animated image showing agent response text incrementally appearing in the chat window.](/screenshots/streaming-chat.gif)

## @Mention

Sending a message at `@mentions` a user is as simple including the details of the user using the `add_mention` method


```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
  await ctx.send(MessageActivityInput(text='hi!').add_mention(account=ctx.activity.from_))
```
