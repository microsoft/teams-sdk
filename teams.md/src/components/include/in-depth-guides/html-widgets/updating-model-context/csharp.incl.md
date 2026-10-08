<!-- parse-code -->

```csharp
using Microsoft.Teams.Apps.HtmlWidget;

teams.OnMessage(async (context, cancellationToken) =>
{
    var modelContext = HtmlWidgetHelpers.TryGetWidgetModelContext(context.Activity);
    if (modelContext is not null)
    {
        // Use modelContext.Params.Content / modelContext.Params.StructuredContent
        // to update your model context for future turns. No response is sent.
        Console.WriteLine($"model context update: {modelContext.Params}");
        return;
    }

    // ... handle other messages
});
```
