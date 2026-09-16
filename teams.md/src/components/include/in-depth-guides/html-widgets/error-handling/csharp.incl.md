<!-- payload-validation -->

```csharp
using Microsoft.Teams.Apps.HtmlWidget;

try
{
    var message = HtmlWidgetHelpers.BuildHtmlWidgetMessage(
        new HtmlWidgetPayload
        {
            Name = "Simple Widget",
            Html = "<div>Hello from a widget</div>",
            Domain = "https://teams.microsoft.com",
        });
    await context.Send(message, cancellationToken);
}
catch (ArgumentException ex)
{
    // Thrown when Name or Html is empty, or Domain is not a valid https:// URL.
    logger.LogError("Invalid widget payload: {Message}", ex.Message);
}
```

<!-- tool-error -->

```csharp
teams.OnWidgetCallTool(async (context, cancellationToken) =>
{
    var toolName = context.Activity.Value?.Name ?? "unknown";

    await Task.CompletedTask;
    return HtmlWidgetCallToolResponse.FromError($"Unknown tool: {toolName}");
});
```
