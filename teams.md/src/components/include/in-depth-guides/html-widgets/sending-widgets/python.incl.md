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
from microsoft_teams.apps.utils.html_widget import build_html_widget_markdown

# build_html_widget_markdown returns just the string, so you can compose several
# widgets into one message or splice a widget into text you already have.
weather = build_html_widget_markdown(
    HtmlWidgetPayload(
        name="Weather",
        html="<div>Sunny, 72F</div>",
        domain="https://teams.microsoft.com",
    )
)

forecast = build_html_widget_markdown(
    HtmlWidgetPayload(
        name="Forecast",
        html="<div>Rain tomorrow</div>",
        domain="https://teams.microsoft.com",
    )
)

text = f"Today:\n\n{weather}\n\nLooking ahead:\n\n{forecast}"
await ctx.send(MessageActivityInput(text=text, text_format="extendedmarkdown"))
```

<!-- inject-code -->

```python
from microsoft_teams.apps.utils.html_widget import (
    InjectWidgetProtocolOptions,
    inject_widget_protocol,
)

html = inject_widget_protocol(
    "<body><h1>Hello</h1></body>",
    InjectWidgetProtocolOptions(
        name="My Widget",
        version="2.0.0",
        available_display_modes=["inline", "fullscreen"],
        notifications=["tool-result", "tool-input"],
    ),
)
```
