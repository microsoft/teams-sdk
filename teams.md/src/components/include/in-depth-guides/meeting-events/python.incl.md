<!-- meeting-start -->

```python
from microsoft_teams.api.activities.event import MeetingStartEventActivity
from microsoft_teams.apps import ActivityContext, App
from microsoft_teams.cards import AdaptiveCard, OpenUrlAction, TextBlock

app = App()

@app.on_meeting_start
async def handle_meeting_start(ctx: ActivityContext[MeetingStartEventActivity]):
    meeting_data = ctx.activity.value
    start_time = meeting_data.start_time.strftime("%c")

    card = AdaptiveCard(
        body=[
            TextBlock(
                text=f"'{meeting_data.title}' has started at {start_time}.",
                wrap=True,
                weight="Bolder",
            )
        ],
        actions=[OpenUrlAction(url=meeting_data.join_url, title="Join the meeting")],
    )

    await ctx.send(card)
```

<!-- meeting-end -->

```python
from microsoft_teams.api.activities.event import MeetingEndEventActivity
from microsoft_teams.apps import ActivityContext, App
from microsoft_teams.cards import AdaptiveCard, TextBlock

app = App()

@app.on_meeting_end
async def handle_meeting_end(ctx: ActivityContext[MeetingEndEventActivity]):
    meeting_data = ctx.activity.value
    end_time = meeting_data.end_time.strftime("%c")

    card = AdaptiveCard(
        body=[
            TextBlock(
                text=f"'{meeting_data.title}' has ended at {end_time}.",
                wrap=True,
                weight="Bolder",
            )
        ]
    )

    await ctx.send(card)
```

<!-- participant-join -->

```python
from microsoft_teams.api.activities.event import MeetingParticipantJoinEventActivity
from microsoft_teams.apps import ActivityContext, App
from microsoft_teams.cards import AdaptiveCard, TextBlock

app = App()

@app.on_meeting_participant_join
async def handle_meeting_participant_join(ctx: ActivityContext[MeetingParticipantJoinEventActivity]):
    meeting_data = ctx.activity.value
    member = meeting_data.members[0].user.name
    role = meeting_data.members[0].meeting.role if hasattr(meeting_data.members[0].meeting, "role") else "a participant"

    card = AdaptiveCard(
        body=[
            TextBlock(
                text=f"{member} has joined the meeting as {role}.",
                wrap=True,
                weight="Bolder",
            )
        ]
    )

    await ctx.send(card)
```

<!-- participant-leave -->

```python
from microsoft_teams.api.activities.event import MeetingParticipantLeaveEventActivity
from microsoft_teams.apps import ActivityContext, App
from microsoft_teams.cards import AdaptiveCard, TextBlock

app = App()

@app.on_meeting_participant_leave
async def handle_meeting_participant_leave(ctx: ActivityContext[MeetingParticipantLeaveEventActivity]):
    meeting_data = ctx.activity.value
    member = meeting_data.members[0].user.name

    card = AdaptiveCard(
        body=[
            TextBlock(
                text=f"{member} has left the meeting.",
                wrap=True,
                weight="Bolder",
            )
        ]
    )

    await ctx.send(card)
```
