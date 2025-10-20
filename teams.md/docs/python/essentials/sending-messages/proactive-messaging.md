---
sidebar_position: 1
summary: Learn how to send proactive messages to users without waiting for them to initiate the conversation, including storing conversation IDs and sending notifications.
---

# Proactive Messaging

In [Sending Messages](./), you were shown how to respond to an event when it happens. However, there are times when you want to send a message to the user without them sending a message first. This is called proactive messaging. You can do this by using the `send` method in the `app` instance. This approach is useful for sending notifications or reminders to the user.

The main thing to note is that you need to have the `conversation_id` of the chat or channel that you want to send the message to. It's a good idea to store this value somewhere from an activity handler so that you can use it for proactive messaging later.


```python
from microsoft.teams.api import InstalledActivity, MessageActivityInput
from microsoft.teams.apps import ActivityContext
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

Then, when you want to send a proactive message, you can retrieve the `conversation_id` from storage and use it to send the message.

```python
from microsoft.teams.api import MessageActivityInput
# ...

async def send_proactive_notification(user_id: str):
    conversation_id = storage.get(user_id, "")
    if not conversation_id:
        return
    activity = MessageActivityInput(text="Hey! It's been a while. How are you?")
    await app.send(conversation_id, activity)
```

:::tip
In this example, you see how to get the conversation_id using one of the activity handlers. This is a good place to store the conversation id, but you can also do this in other places like when the user installs the app or when they sign in. The important thing is that you have the conversation id stored somewhere so you can use it later.
:::