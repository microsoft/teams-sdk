<!-- hosted-image -->

```python
from microsoft_teams.api import Attachment, MessageActivity, MessageActivityInput
from microsoft_teams.apps import ActivityContext


@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]) -> None:
    await ctx.send(
        MessageActivityInput(text="Here is the latest chart:").add_attachments(
            Attachment(
                content_type="image/png",
                content_url="https://contoso.com/charts/weekly.png",
                name="weekly.png",
            )
        )
    )
```

<!-- inline-bytes -->

```python
from base64 import b64encode
from pathlib import Path

from microsoft_teams.api import Attachment, MessageActivity, MessageActivityInput
from microsoft_teams.apps import ActivityContext


@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]) -> None:
    encoded = b64encode(Path("./charts/weekly.png").read_bytes()).decode("ascii")

    await ctx.send(
        MessageActivityInput(text="Here is the latest chart:").add_attachments(
            Attachment(
                content_type="image/png",
                content_url=f"data:image/png;base64,{encoded}",
                name="weekly.png",
            )
        )
    )
```

<!-- positioned-image -->

```python
import base64
from pathlib import Path

from microsoft_teams.api import MessageActivity, MessageActivityInput
from microsoft_teams.apps import ActivityContext


@app.on_message
async def send_positioned_image(ctx: ActivityContext[MessageActivity]) -> None:
    encoded = base64.b64encode(Path("charts/weekly.png").read_bytes()).decode()

    await ctx.send(
        MessageActivityInput(
            text=f'<div>Revenue is up.<img src="data:image/png;base64,{encoded}"/>Questions?</div>'
        ).with_text_format("xml")
    )
```

<!-- attachment-table -->

| Property | Description |
|---|---|
| `content_type` | Required. The image's MIME type (`image/png`, `image/jpeg`, or `image/gif`). This is what makes Teams render the attachment as a picture, so it has to match the actual bytes. |
| `content_url` | The image itself: either a reachable `https://` URL, or a `data:<mime>;base64,<encoded>` URI. |
| `name` | Optional display name for the attachment (e.g. `weekly.png`). |
| `thumbnail_url` | Optional preview image. Rarely needed for an inline image, since the image is already its own preview. |
| `content` | Embedded payload, used by card attachments. Leave it unset for an image. |

Each field is serialized to its camelCase wire name (`content_type` becomes `contentType`, `content_url` becomes `contentUrl`), so set them by their Python names and the SDK handles the rest.

<!-- multiple-images -->

```python
from microsoft_teams.api import Attachment, AttachmentLayout, MessageActivityInput

activity = MessageActivityInput(text="This week at a glance:").add_attachments(
    Attachment(
        content_type="image/png",
        content_url="https://contoso.com/charts/sales.png",
        name="sales.png",
    ),
    Attachment(
        content_type="image/png",
        content_url="https://contoso.com/charts/traffic.png",
        name="traffic.png",
    ),
)
activity.attachment_layout = AttachmentLayout.CAROUSEL

await ctx.send(activity)
```

`add_attachments()` is variadic and appends, so calling it more than once builds the list up rather than replacing it. `AttachmentLayout` has two members: `LIST` (the default) and `CAROUSEL`.

<!-- card-image -->

```python
from microsoft_teams.cards import AdaptiveCard, Image

card = AdaptiveCard(
    body=[
        Image(
            url="https://contoso.com/charts/weekly.png",
            alt_text="Weekly sales chart",
            size="Large",
        )
    ]
)

await ctx.send(card)
```
