<!-- handler-code -->

```python
from typing import Any

from microsoft_teams.api import HtmlWidgetCallToolInvokeActivity
from microsoft_teams.api.models.html_widget import (
    HtmlWidgetCallToolResponse,
    McpUiCallToolResult,
    McpUiTextContent,
)
from microsoft_teams.apps import ActivityContext


@app.on_widget_call_tool
async def handle_widget_call_tool(
    ctx: ActivityContext[HtmlWidgetCallToolInvokeActivity],
) -> HtmlWidgetCallToolResponse:
    tool_name = ctx.activity.value.name
    args: dict[str, Any] = ctx.activity.value.arguments or {}

    if tool_name == "getTime":
        from datetime import datetime, timezone

        now = datetime.now(tz=timezone.utc)
        result = McpUiCallToolResult(
            content=[McpUiTextContent(type="text", text=now.strftime("%H:%M:%S"))],
            structured_content={"time": now.isoformat()},
            is_error=False,
        )
    else:
        result = McpUiCallToolResult(
            content=[McpUiTextContent(type="text", text=f"Unknown tool: {tool_name}")],
            is_error=True,
        )

    return HtmlWidgetCallToolResponse(
        response_type="htmlwidget/calltoolresult",
        call_tool_result=result,
    )
```

<!-- response-intro -->

Return an `HtmlWidgetCallToolResponse` with `response_type` set to `htmlwidget/calltoolresult` and a `call_tool_result` payload.
The result's `content` is a list of content blocks; `structured_content` holds data the widget can render from; `is_error` signals a failure.

<!-- response-code -->

```python
result = McpUiCallToolResult(
    content=[McpUiTextContent(type="text", text="Refreshed!")],
    structured_content={"counter": 1, "lastAction": "refresh"},
    is_error=False,
)

return HtmlWidgetCallToolResponse(
    response_type="htmlwidget/calltoolresult",
    call_tool_result=result,
)
```
