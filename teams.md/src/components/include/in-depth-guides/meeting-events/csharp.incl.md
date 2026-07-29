<!-- meeting-start -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register meeting start handler
app.OnMeetingStart(async (context, cancellationToken) =>
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

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register meeting start handler
teams.OnMeetingStart(async (context, cancellationToken) =>
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

    TeamsAttachment attachment = TeamsAttachment.CreateBuilder()
        .WithAdaptiveCard(JsonSerializer.SerializeToElement(card))
        .Build();
    await context.SendAsync(new MessageActivityInput().AddAttachment(attachment), cancellationToken);
});
```

</TabItem>
</Tabs>

<!-- meeting-end -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register meeting end handler
app.OnMeetingEnd(async (context, cancellationToken) =>
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

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register meeting end handler
teams.OnMeetingEnd(async (context, cancellationToken) =>
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

    TeamsAttachment attachment = TeamsAttachment.CreateBuilder()
        .WithAdaptiveCard(JsonSerializer.SerializeToElement(card))
        .Build();
    await context.SendAsync(new MessageActivityInput().AddAttachment(attachment), cancellationToken);
});
```

</TabItem>
</Tabs>

<!-- participant-join -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register participant join handler
app.OnMeetingJoin(async (context, cancellationToken) =>
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

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register participant join handler
teams.OnMeetingJoin(async (context, cancellationToken) =>
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

    TeamsAttachment attachment = TeamsAttachment.CreateBuilder()
        .WithAdaptiveCard(JsonSerializer.SerializeToElement(card))
        .Build();
    await context.SendAsync(new MessageActivityInput().AddAttachment(attachment), cancellationToken);
});
```

</TabItem>
</Tabs>

<!-- participant-leave -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register participant leave handler
app.OnMeetingLeave(async (context, cancellationToken) =>
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

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Activities.Events;
using Microsoft.Teams.Cards;

// Register participant leave handler
teams.OnMeetingLeave(async (context, cancellationToken) =>
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

    TeamsAttachment attachment = TeamsAttachment.CreateBuilder()
        .WithAdaptiveCard(JsonSerializer.SerializeToElement(card))
        .Build();
    await context.SendAsync(new MessageActivityInput().AddAttachment(attachment), cancellationToken);
});
```

</TabItem>
</Tabs>
