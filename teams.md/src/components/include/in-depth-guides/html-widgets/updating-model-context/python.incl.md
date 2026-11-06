<!-- parse-code -->

```python
from microsoft_teams.api import MessageActivity
from microsoft_teams.apps import ActivityContext, App
from microsoft_teams.apps.utils.html_widget import try_get_widget_model_context

app = App()


@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]) -> None:
    model_context = try_get_widget_model_context(ctx.activity)
    if model_context is not None:
        # Use model_context.params.content / model_context.params.structured_content
        # to update your model context for future turns. No response is sent.
        print("model context update:", model_context.params)
        return

    # ... handle other messages
```
