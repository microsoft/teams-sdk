<!-- ai-generated-method -->

This can be done by calling the `.AddAIGenerated()` method on outgoing messages.

<!-- ai-generated-code -->

```csharp
var messageActivity = new MessageActivity
{
    Text = "Hello!",
}.AddAIGenerated();
```

<!-- citations-method -->

This is easy to do by using the `AddCitation` method on the message.

<!-- citations-code -->

```csharp
var messageActivity = new MessageActivity
{
    Text = result.Content,
}.AddAIGenerated();

for (int i = 0; i < citedDocs.Length; i++)
{
    messageActivity.Text += $"[{i + 1}]";
    messageActivity.AddCitation(i + 1, new CitationAppearance
    {
        Name = citedDocs[i].Title,
        Abstract = citedDocs[i].Content
    });
}
```

<!-- suggested-actions-method -->

You can do that by using the `WithSuggestedActions` method on the message.

<!-- suggested-actions-code -->

```csharp
var message = new MessageActivity
{
    Text = result.Content,
}.WithSuggestedActions(
    new Microsoft.Teams.Api.SuggestedActions() {
        To = [context.Activity.From.Id],
        Actions = [
            new Microsoft.Teams.Api.Cards.Action(ActionType.IMBack) {
                Title = "Thank you!",
                Value = "Thank you very much!"
                }
        ]
    }).AddAIGenerated();
await context.Send(message);
```

<!-- suggested-actions-submit-send-method -->

Use the `ActionType.Submit` suggested action type when you want the click to deliver a structured payload to your bot without posting a visible message on the user's behalf.

:::warning Experimental API
`ActionType.Submit` and `OnSuggestedActionSubmit` are marked `[Experimental("ExperimentalTeamsSuggestedAction")]`. The platform feature will be generally available by end of summer 2026.
:::

<!-- suggested-actions-submit-send-code -->

```csharp
#pragma warning disable ExperimentalTeamsSuggestedAction

using CardAction = Microsoft.Teams.Api.Cards.Action;
using CardActionType = Microsoft.Teams.Api.Cards.ActionType;

var reply = new MessageActivity("Approve or reject the request:")
{
    SuggestedActions = new SuggestedActions
    {
        Actions =
        {
            new CardAction(CardActionType.Submit) { Title = "Approve", Value = new { vote = "approve" } },
            new CardAction(CardActionType.Submit) { Title = "Reject",  Value = new { vote = "reject" } }
        }
    }
};
await context.Send(reply);
```

<!-- suggested-actions-submit-handle-method -->

The click arrives as a typed `suggestedActions/submit` invoke. Register a handler with `OnSuggestedActionSubmit` and read the payload from `context.Activity.Value`.

<!-- suggested-actions-submit-handle-code -->

```csharp
#pragma warning disable ExperimentalTeamsSuggestedAction

using System.Text.Json;
using Microsoft.Teams.Apps.Activities.Invokes;

teams.OnSuggestedActionSubmit(async (context, cancellationToken) =>
{
    var payload = context.Activity.Value is JsonElement value
        ? value.GetRawText()
        : "<none>";

    await context.Send($"Got vote: {payload}", cancellationToken);
});
```
