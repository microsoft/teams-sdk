<!-- api-object-name -->

`app.api`

<!-- api-table -->

| Area            | Description                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversations` | Gives your application the ability to perform activities on conversations (send, update, delete messages, etc.), or create conversations (like 1:1 chat with a user). Also includes `reactions` for adding/removing emoji reactions to messages |
| `meetings`      | Gives your application access to meeting details and participant information via `get_by_id` and `get_participant`                                                                                                                              |
| `teams`         | Gives your application access to team or channel details                                                                                                                                                                                        |

<!-- api-object-description -->

`api`

<!-- handler-example -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    members = await ctx.api.conversations.members.get(ctx.activity.conversation.id)
```

<!-- meetings-example -->

```python
@app.on_activity("meetingStart")
async def handle_meeting_start(ctx: ActivityContext):
    meeting_id = ctx.activity.channel_data.meeting.id
    tenant_id = ctx.activity.channel_data.tenant.id
    user_id = ctx.activity.from_.aad_object_id

    if meeting_id and tenant_id and user_id:
        participant = await ctx.api.meetings.get_participant(meeting_id, user_id, tenant_id)
        # participant.meeting.role — "Organizer", "Presenter", "Attendee"
        # participant.meeting.in_meeting — True/False
```

<!-- proactive-example -->

```python
members = await app.api.conversations.members.get("...")
```
