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

<!-- to-thread-id-method-name -->

`to_threaded_conversation_id()`

<!-- app-send-method-name -->

`app.send()`

<!-- threading-proactive-example -->

```python
# Send to a specific thread proactively
await app.reply(conversation_id, message_id, "Thread update!")

# Send to a flat conversation (1:1, group chat)
await app.reply(conversation_id, "Hello!")
```

<!-- threading-helper-example -->

```python
from microsoft_teams.apps import to_threaded_conversation_id

thread_id = to_threaded_conversation_id(conversation_id, message_id)
await app.send(thread_id, "Sent via helper")
```