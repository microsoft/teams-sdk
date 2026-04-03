<!-- meeting-start -->

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register meeting start handler
teamsApp.OnMeetingStart(async (context, cancellationToken) =>
{
    var activity = context.Activity.Value;
    var startTime = activity.StartTime.ToLocalTime();

    var card = new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new TextBlock($"'{activity.Title}' has started at {startTime}.")
            {
                Wrap = true,
                Weight = TextWeight.Bolder
            }
        },
        Actions = new List<Microsoft.Teams.Cards.Action>
        {
            new OpenUrlAction(activity.JoinUrl)
            {
                Title = "Join the meeting",
            }
        }
    };

    await context.Send(card, cancellationToken);
});
```

<!-- meeting-end -->

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register meeting end handler
teamsApp.OnMeetingEnd(async (context, cancellationToken) =>
{
    var activity = context.Activity.Value;
    var endTime = activity.EndTime.ToLocalTime();

    var card = new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new TextBlock($"'{activity.Title}' has ended at {endTime}.")
            {
                Wrap = true,
                Weight = TextWeight.Bolder
            }
        }
    };

    await context.Send(card, cancellationToken);
});
```

<!-- participant-join -->

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register participant join handler
teamsApp.OnMeetingJoin(async (context, cancellationToken) =>
{
    var activity = context.Activity.Value;
    var member = activity.Members[0].User.Name;
    var role = activity.Members[0].Meeting.Role;

    var card = new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new TextBlock($"{member} has joined the meeting as {role}.")
            {
                Wrap = true,
                Weight = TextWeight.Bolder
            }
        }
    };

    await context.Send(card, cancellationToken);
});
```

<!-- participant-leave -->

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register participant leave handler
teamsApp.OnMeetingLeave(async (context, cancellationToken) =>
{
    var activity = context.Activity.Value;
    var member = activity.Members[0].User.Name;

    var card = new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new TextBlock($"{member} has left the meeting.")
            {
                Wrap = true,
                Weight = TextWeight.Bolder
            }
        }
    };

    await context.Send(card, cancellationToken);
});
```
