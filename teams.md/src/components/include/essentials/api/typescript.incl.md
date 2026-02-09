<!-- api-object-name -->

`app.api`

<!-- api-table -->

| Area            | Description                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversations` | Gives your application the ability to perform activities on conversations (send, update, delete messages, etc.), or create conversations (like 1:1 chat with a user) |
| `meetings`      | Gives your application access to meeting details and participant information via `getById` and `getParticipant`                                                       |
| `teams`         | Gives your application access to team or channel details                                                                                                             |

<!-- api-object-description -->

`api`

<!-- handler-example -->

```typescript
app.on('message', async ({ activity, api }) => {
  const members = await api.conversations.members(activity.conversation.id).get();
});
```

<!-- meetings-example -->

```typescript
app.on('meetingStart', async ({ activity, api }) => {
  const meetingId = activity.channelData?.meeting?.id;
  const tenantId = activity.channelData?.tenant?.id;
  const userId = activity.from?.aadObjectId;

  if (meetingId && tenantId && userId) {
    const participant = await api.meetings.getParticipant(meetingId, userId, tenantId);
    // participant.meeting?.role — "Organizer", "Presenter", "Attendee"
    // participant.meeting?.inMeeting — true/false
  }
});
```

<!-- proactive-example -->

```typescript
import * as endpoints from '@microsoft/teams.graph-endpoints';

const res = await app.api.graph.call(endpoints.chats.getAllMessages.get);
```
