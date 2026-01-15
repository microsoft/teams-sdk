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
# ...

async def send_targeted_proactive_notification(user_id: str, recipient_id: str):
    conversation_id = storage.get(user_id, "")
    if not conversation_id:
        return
    
    activity = MessageActivityInput(text="This is a private reminder just for you!")
    activity.recipient = Account(id=recipient_id, role="user")
    
    await app.send(conversation_id, activity, is_targeted=True)
```