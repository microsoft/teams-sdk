<!-- handler-code -->

```csharp
using Microsoft.Teams.Apps.HtmlWidget;

teams.OnWidgetCallTool(async (context, cancellationToken) =>
{
    var request = context.Activity.Value;
    var toolName = request?.Name ?? "unknown";

    var response = toolName switch
    {
        "getTime" => new HtmlWidgetCallToolResponse
        {
            CallToolResult = new McpUiCallToolResult
            {
                Content = [new McpUiCallToolResultContent { Text = DateTime.UtcNow.ToString("HH:mm:ss") }],
                StructuredContent = new { time = DateTime.UtcNow.ToString("o") },
            }
        },
        _ => HtmlWidgetCallToolResponse.FromError($"Unknown tool: {toolName}"),
    };

    await Task.CompletedTask;
    return response;
});
```

<!-- response-intro -->

Return an `HtmlWidgetCallToolResponse` whose `ResponseType` is `htmlwidget/calltoolresult` and whose `CallToolResult` holds the payload.
The result's `Content` is a list of content blocks; `StructuredContent` holds data the widget can render from; `IsError` signals a failure.
For the common text-only case, use the `FromText` and `FromError` factory methods.

<!-- response-code -->

```csharp
var response = new HtmlWidgetCallToolResponse
{
    CallToolResult = new McpUiCallToolResult
    {
        Content = [new McpUiCallToolResultContent { Text = "Refreshed!" }],
        StructuredContent = new { counter = 1, lastAction = "refresh" },
    }
};

// Or, for a simple text result:
var quick = HtmlWidgetCallToolResponse.FromText("Refreshed!");
```
