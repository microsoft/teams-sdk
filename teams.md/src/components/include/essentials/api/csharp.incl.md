<!-- api-object-name -->

`app.Api`

<!-- api-table -->

| Area            | Description                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Conversations` | Gives your application the ability to perform activities on conversations (send, update, delete messages, etc.), or create conversations (like 1:1 chat with a user). Also includes `Reactions` for adding/removing emoji reactions to messages |
| `Meetings`      | Gives your application access to meeting details and participant information via `GetByIdAsync` and `GetParticipantAsync`                                                                                                                       |
| `Teams`         | Gives your application access to team or channel details                                                                                                                                                                                        |

<!-- api-object-description -->

`Api`

<!-- handler-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

```csharp
app.OnMessage(async context =>
{
    var members = await context.Api.Conversations.Members.Get(context.Conversation.Id);
});
```

<!-- meetings-example -->

```csharp
app.OnMeetingStart(async context =>
{
    var meetingId = context.Activity.Value.Id;
    var tenantId = context.Activity.ChannelData?.Tenant?.Id;
    var userId = context.Activity.From?.AadObjectId;

    if (meetingId != null && tenantId != null && userId != null)
    {
        var participant = await context.Api.Meetings.GetParticipantAsync(meetingId, userId, tenantId);
        // participant.Meeting?.Role — "Organizer", "Presenter", "Attendee"
        // participant.Meeting?.InMeeting — true/false
    }
});
```

<!-- proactive-example -->

```csharp
var members = await app.Api.Conversations.Members.Get("...");
```
