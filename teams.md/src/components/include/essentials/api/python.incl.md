<!-- api-object-name -->

`app.api`

<!-- api-table -->

| Area            | Description                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversations` | Gives your application the ability to perform activities on conversations (send, update, delete messages, etc.), or create conversations (like 1:1 chat with a user) |
| `meetings`      | Gives your application access to meeting details                                                                                                                     |
| `teams`         | Gives your application access to team or channel details                                                                                                             |

<!-- api-object-description -->

`api`

<!-- handler-example -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    members = await ctx.api.conversations.members.get(ctx.activity.conversation.id)
```

<!-- proactive-example -->

```python
members = await app.api.conversations.members.get("...")
```
