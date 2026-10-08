<!-- download-image -->

```python
import base64

from microsoft_teams.api import MessageActivity
from microsoft_teams.apps import ActivityContext


@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]) -> None:
    image = next(
        (
            attachment
            for attachment in (ctx.activity.attachments or [])
            if attachment.content_type
            and attachment.content_type.startswith("image/")
            and attachment.content_url
        ),
        None,
    )

    if image and image.content_url:
        response = await app.api.http.get(image.content_url)
        # The response content contains the image body as bytes.
        image_bytes = response.content
        image_base64 = base64.b64encode(image_bytes).decode("ascii")

        # Pass image_bytes or image_base64 to your image-processing or model client.
```
