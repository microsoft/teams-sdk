<!-- storage -->

```csharp
// This store would ideally be persisted in a database
public static class FeedbackStore
{
    public static readonly Dictionary<string, FeedbackData> StoredFeedbackByMessageId = new();

    public class FeedbackData
    {
        public string IncomingMessage { get; set; } = string.Empty;
        public string OutgoingMessage { get; set; } = string.Empty;
        public int Likes { get; set; }
        public int Dislikes { get; set; }
        public List<string> Feedbacks { get; set; } = new();
    }
}
```

<!-- including-feedback -->

```csharp
var sentMessageId = await context.Send(
    result.Content != null
        ? new MessageActivity(result.Content)
            .AddAiGenerated()
            /** Add feedback buttons via this method */
            .AddFeedback()
        : "I did not generate a response."
);

FeedbackStore.StoredFeedbackByMessageId[sentMessageId.Id] = new FeedbackStore.FeedbackData
{
    IncomingMessage = context.Activity.Text,
    OutgoingMessage = result.Content ?? string.Empty,
    Likes = 0,
    Dislikes = 0,
    Feedbacks = new List<string>()
};
```

<!-- handling-feedback -->

```csharp
[Microsoft.Teams.Apps.Activities.Invokes.Message.Feedback]
public Task OnFeedbackReceived([Context] Microsoft.Teams.Api.Activities.Invokes.Messages.SubmitActionActivity activity)
{
    var reaction = activity.Value?.ActionValue?.GetType().GetProperty("reaction")?.GetValue(activity.Value?.ActionValue)?.ToString();
    var feedbackJson = activity.Value?.ActionValue?.GetType().GetProperty("feedback")?.GetValue(activity.Value?.ActionValue)?.ToString();

    if (activity.ReplyToId == null)
    {
        _log.LogWarning("No replyToId found for messageId {ActivityId}", activity.Id);
        return Task.CompletedTask;
    }

    var existingFeedback = FeedbackStore.StoredFeedbackByMessageId.GetValueOrDefault(activity.ReplyToId);
    /**
        * feedbackJson looks like:
        * {"feedbackText":"Nice!"}
        */
    if (existingFeedback == null)
    {
        _log.LogWarning("No feedback found for messageId {ActivityId}", activity.Id);
    }
    else
    {
        var updatedFeedback = new FeedbackStore.FeedbackData
        {
            IncomingMessage = existingFeedback.IncomingMessage,
            OutgoingMessage = existingFeedback.OutgoingMessage,
            Likes = existingFeedback.Likes + (reaction == "like" ? 1 : 0),
            Dislikes = existingFeedback.Dislikes + (reaction == "dislike" ? 1 : 0),
            Feedbacks = existingFeedback.Feedbacks.Concat(new[] { feedbackJson ?? string.Empty }).ToList()
        };

        FeedbackStore.StoredFeedbackByMessageId[activity.Id] = updatedFeedback;
    }

    return Task.CompletedTask;
}
```
