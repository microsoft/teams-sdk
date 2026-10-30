<!-- conversation-id-field -->

`conversation_id`

<!-- install-handler-example -->

```python
from microsoft_teams.api import InstalledActivity, MessageActivityInput
from microsoft_teams.apps import ActivityContext
# ...

# This would be some persistent storage
storage = dict[str, str]()

# Installation is just one place to get the conversation_id. All activities have this field as well.
@app.on_install_add
async def handle_install_add(ctx: ActivityContext[InstalledActivity]):
    # Save the conversation_id
    storage[ctx.activity.from_.aad_object_id] = ctx.activity.conversation.id
    await ctx.send("Hi! I am going to remind you to say something to me soon!")
    # This queues up the proactive notifaction to be sent in 1 minute
    notication_queue.add_reminder(ctx.activity.from_.aad_object_id, send_proactive_notification, 60000)
```

<!-- send-proactive-example -->

```python
from microsoft_teams.api import MessageActivityInput
# ...

async def send_proactive_notification(user_id: str):
    conversation_id = storage.get(user_id, "")
    if not conversation_id:
        return
    activity = MessageActivityInput(text="Hey! It's been a while. How are you?")
    await app.send(conversation_id, activity)
```

<!-- targeted-proactive-example -->

```python
from microsoft_teams.api import MessageActivityInput, Account

# When sending proactively, you must provide an explicit recipient account
async def send_targeted_notification(conversation_id: str, recipient: Account):
    await app.send(
        conversation_id,
        MessageActivityInput(text="This is a private notification just for you!")
            .with_recipient(recipient, is_targeted=True)
    )
```

<!-- app-reply-method-name -->

`app.reply()`

<!-- app-send-method-name -->

`app.send()`

<!-- threading-proactive-example -->

```python
# chat_or_channel_id is channel_data.chat.id or channel_data.channel.id
# reply_chain_id is channel_data.reply_chain.id
await app.reply(chat_or_channel_id, reply_chain_id, "Thread update!")
```

<!-- threading-top-level-example -->

```python
# Send a new top-level message to the chat or channel
await app.send(chat_or_channel_id, "Hello!")
```

<!-- threading-agentic-example -->

```python
# agentic_identity is None unless the recipient is an agentic user
await app.reply(
    chat_or_channel_id,
    reply_chain_id,
    "Thread update!",
    agentic_identity=ctx.activity.recipient.agentic_identity,
)
```

<!-- threading-service-url-note -->

Inside a handler, a response goes to the `service_url` of the inbound activity.
`app.send()` and `app.reply()` go to the `service_url` argument when you pass one, and otherwise to the app's service URL: the `service_url` app option, else the `SERVICE_URL` environment variable, else `https://smba.trafficmanager.net/teams`.