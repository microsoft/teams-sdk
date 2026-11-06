<!-- payload-validation -->

```csharp
using Microsoft.Teams.Apps.HtmlWidget;

MessageActivityInput message;
try
{
    message = HtmlWidgetHelpers.BuildHtmlWidgetMessage(
        new HtmlWidgetPayload
        {
            Name = "Simple Widget",
            Html = "<div>Hello from a widget</div>",
            Domain = "https://teams.microsoft.com",
        });
}
catch (ArgumentException ex)
{
    // Thrown when Name or Html is empty, or Domain is not a valid https:// URL.
    logger.LogError("Invalid widget payload: {Message}", ex.Message);
    return;
}

await context.SendAsync(message, cancellationToken);
```

<!-- tool-error -->

```csharp
teams.OnWidgetCallTool(async (context, cancellationToken) =>
{
    var toolName = context.Activity.Value?.Name ?? "unknown";

    await Task.CompletedTask;
    return InvokeResponse.Ok(HtmlWidgetCallToolResponse.FromError($"Unknown tool: {toolName}"));
});
```
