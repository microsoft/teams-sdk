<!-- api-table -->

| Area            | Description                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Conversations` | Gives your application the ability to perform activities on conversations (send, update, delete messages, etc.), or create conversations (like 1:1 chat with a user) |
| `Meetings`      | Gives your application access to meeting details and participant information via `GetByIdAsync` and `GetParticipantAsync`                                             |
| `Teams`         | Gives your application access to team or channel details                                                                                                             |

<!-- handler-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    var members = await context.Api.Conversations.Members.Get(context.Conversation.Id);
});
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    var members = await context.Api.Conversations.Members.GetAsync(
        context.Activity.Conversation!.Id!,
        cancellationToken: cancellationToken);
});
```

</TabItem>
</Tabs>

<!-- meetings-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
app.OnMeetingStart(async (context, cancellationToken) =>
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

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMeetingStart(async (context, cancellationToken) =>
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

</TabItem>
</Tabs>

<!-- proactive-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
var members = await app.Api.Conversations.Members.Get("...");
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

Outside of a turn, use the app-level `teams.Api` client (point it at the target service URL first):

```csharp
var api = teams.Api.ForServiceUrl(serviceUrl);
var members = await api.Conversations.Members.GetAsync(conversationId);
```

</TabItem>
</Tabs>
