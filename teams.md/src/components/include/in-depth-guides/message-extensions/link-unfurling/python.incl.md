<!-- handle-link-unfurling-code -->

```python
from microsoft.teams.api import (
    AdaptiveCardAttachment,
    MessageExtensionQueryLinkInvokeActivity,
    ThumbnailCardAttachment,
    card_attachment,
    InvokeResponse,
    AttachmentLayout,
    MessagingExtensionAttachment,
    MessagingExtensionInvokeResponse,
    MessagingExtensionResult,
    MessagingExtensionResultType,
)
from microsoft.teams.apps import ActivityContext
# ...

@app.on_message_ext_query_link
async def handle_message_ext_query_link(ctx: ActivityContext[MessageExtensionQueryLinkInvokeActivity]):
    url = ctx.activity.value.url

    if not url:
        return InvokeResponse[MessagingExtensionInvokeResponse](status=400)

    card_data = create_link_unfurl_card(url)
    main_attachment = card_attachment(AdaptiveCardAttachment(content=card_data["card"]))
    preview_attachment = card_attachment(ThumbnailCardAttachment(content=card_data["thumbnail"]))

    attachment = MessagingExtensionAttachment(
        content_type=main_attachment.content_type,
        content=main_attachment.content,
        preview=preview_attachment,
    )

    result = MessagingExtensionResult(
        type=MessagingExtensionResultType.RESULT,
        attachment_layout=AttachmentLayout.LIST,
        attachments=[attachment],
    )

    return MessagingExtensionInvokeResponse(compose_extension=result)
```

<!-- create-link-unfurl-function -->

`create_link_unfurl_card()` function

```python
from typing import Any, Dict
from microsoft.teams.cards import AdaptiveCard
# ...

def create_link_unfurl_card(url: str) -> Dict[str, Any]:
    """Create a card for link unfurling."""
    thumbnail = {
        "title": "Unfurled Link",
        "text": url,
        "images": [{"url": IMAGE_URL}],
    }

    card = AdaptiveCard.model_validate(
        {
            "type": "AdaptiveCard",
            "version": "1.4",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "Unfurled Link",
                    "size": "Large",
                    "weight": "Bolder",
                    "color": "Accent",
                    "style": "heading",
                },
                {
                    "type": "TextBlock",
                    "text": url,
                    "size": "Small",
                    "weight": "Lighter",
                    "color": "Good",
                },
            ],
        }
    )

    return {"card": card, "thumbnail": thumbnail}
```
