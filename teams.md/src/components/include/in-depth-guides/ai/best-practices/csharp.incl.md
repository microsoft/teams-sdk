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
