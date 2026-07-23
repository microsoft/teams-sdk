<!-- build-message-code -->

```python
from microsoft_teams.api.models.html_widget import HtmlWidgetPayload
from microsoft_teams.apps import ActivityContext, App
from microsoft_teams.apps.utils.html_widget import build_html_widget_message

app = App()


@app.on_message
async def handle_message(ctx: ActivityContext) -> None:
    message = build_html_widget_message(
        HtmlWidgetPayload(
            name="Simple Widget",
            html="<div>Hello from a widget</div>",
            domain="https://teams.microsoft.com",
        )
    )
    await ctx.send(message)
```

<!-- before-after-code -->

```python
from microsoft_teams.apps.utils.html_widget import (
    HtmlWidgetMarkdownOptions,
    build_html_widget_message,
)

message = build_html_widget_message(
    HtmlWidgetPayload(
        name="Simple Widget",
        html="<div>Hello from a widget</div>",
        domain="https://teams.microsoft.com",
    ),
    HtmlWidgetMarkdownOptions(
        before="Here is a simple static widget:",
        after="No callbacks needed for static content.",
    ),
)
await ctx.send(message)
```

<!-- build-markdown-code -->

```python
from microsoft_teams.api.activities.message import MessageActivityInput
from microsoft_teams.apps.utils.html_widget import (
    HtmlWidgetMarkdownOptions,
    build_html_widget_markdown,
)

markdown = build_html_widget_markdown(
    HtmlWidgetPayload(
        name="Simple Widget",
        html="<div>Hello from a widget</div>",
        domain="https://teams.microsoft.com",
    ),
    HtmlWidgetMarkdownOptions(before="Here is a simple static widget:"),
)
await ctx.send(MessageActivityInput(text=markdown, text_format="extendedmarkdown"))
```
