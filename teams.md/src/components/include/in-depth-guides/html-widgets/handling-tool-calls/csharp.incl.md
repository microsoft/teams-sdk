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
`Content`, `StructuredContent` and `IsError` are always serialized, defaulting to an empty array, an empty object and `false`, because an omitted field can reach the widget as `null`.
For the common text-only case, use the `FromText` and `FromError` factory methods.
.NET has no `buildCallToolResult` equivalent, because `McpUiCallToolResult` applies those defaults itself: `Content` and `StructuredContent` fall back to an empty array and object when you assign `null`, and `IsError` is a `bool` that defaults to `false`.

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

<!-- context-intro -->

There is no separate .NET type for the entry. `Arguments` is typed `object?`, and it is a `JsonElement` when the widget sent an object.
Read the entry from `context.Activity.Value.Arguments` if you need `mcpUrl` or `correlationId`, and ignore it when you treat the remaining arguments as your tool's input:

```csharp
if (context.Activity.Value?.Arguments is JsonElement { ValueKind: JsonValueKind.Object } args
    && args.TryGetProperty("__msteams__", out var msteams)
    && msteams.TryGetProperty("correlationId", out var correlationId))
{
    // correlationId.GetString()
}
```
