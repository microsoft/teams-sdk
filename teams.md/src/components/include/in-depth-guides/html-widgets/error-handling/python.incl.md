<!-- payload-validation -->

```python
from microsoft_teams.api.models.html_widget import HtmlWidgetPayload
from microsoft_teams.apps.utils.html_widget import build_html_widget_message

try:
    message = build_html_widget_message(
        HtmlWidgetPayload(
            name="Simple Widget",
            html="<div>Hello from a widget</div>",
            domain="https://teams.microsoft.com",
        )
    )
    await ctx.send(message)
except ValueError as err:
    # Raised when name or html is empty, or domain is not a valid https:// URL.
    logger.error("Invalid widget payload: %s", err)
```

<!-- tool-error -->

```python
from microsoft_teams.api.models.html_widget import (
    HtmlWidgetCallToolResponse,
    McpUiCallToolResult,
    McpUiTextContent,
)

result = McpUiCallToolResult(
    content=[McpUiTextContent(type="text", text=f"Unknown tool: {tool_name}")],
    is_error=True,
)

return HtmlWidgetCallToolResponse(
    response_type="htmlwidget/calltoolresult",
    call_tool_result=result,
)
```
