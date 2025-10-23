<!-- handle-submission-code -->

```python
from microsoft.teams.api import AdaptiveCardAttachment, MessageExtensionQueryInvokeActivity, ThumbnailCardAttachment, card_attachment, InvokeResponse, AttachmentLayout, MessagingExtensionAttachment, MessagingExtensionInvokeResponse, MessagingExtensionResult, MessagingExtensionResultType
# ...

@app.on_message_ext_query
async def handle_message_ext_query(ctx: ActivityContext[MessageExtensionQueryInvokeActivity]):
    command_id = ctx.activity.value.command_id
    search_query = ""
    if ctx.activity.value.parameters and len(ctx.activity.value.parameters) > 0:
        search_query = ctx.activity.value.parameters[0].value or ""

    if command_id == "searchQuery":
        cards = await create_dummy_cards(search_query)
        attachments: list[MessagingExtensionAttachment] = []
        for card_data in cards:
            main_attachment = card_attachment(AdaptiveCardAttachment(content=card_data["card"]))
            preview_attachment = card_attachment(ThumbnailCardAttachment(content=card_data["thumbnail"]))

            attachment = MessagingExtensionAttachment(
                content_type=main_attachment.content_type, content=main_attachment.content, preview=preview_attachment
            )
            attachments.append(attachment)

        result = MessagingExtensionResult(
            type=MessagingExtensionResultType.RESULT, attachment_layout=AttachmentLayout.LIST, attachments=attachments
        )

        return MessagingExtensionInvokeResponse(compose_extension=result)

    return InvokeResponse[MessagingExtensionInvokeResponse](status=400)

```

<!-- create-dummy-cards-function -->

`create_dummy_cards()` method

```python
from typing import Any, Dict, List
from microsoft.teams.cards import AdaptiveCard
# ...

async def create_dummy_cards(search_query: str) -> List[Dict[str, Any]]:
    """Create dummy cards for search results."""
    dummy_items = [
        {
            "title": "Item 1",
            "description": f"This is the first item and this is your search query: {search_query}",
        },
        {"title": "Item 2", "description": "This is the second item"},
        {"title": "Item 3", "description": "This is the third item"},
        {"title": "Item 4", "description": "This is the fourth item"},
        {"title": "Item 5", "description": "This is the fifth item"},
    ]

    cards: List[Dict[str, Any]] = []
    for item in dummy_items:
        card_data: Dict[str, Any] = {
            "card": AdaptiveCard.model_validate(
                {
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": [
                        {
                            "type": "TextBlock",
                            "text": item["title"],
                            "size": "Large",
                            "weight": "Bolder",
                            "color": "Accent",
                            "style": "heading",
                        },
                        {"type": "TextBlock", "text": item["description"], "wrap": True, "spacing": "Medium"},
                    ],
                }
            ),
            "thumbnail": {
                "title": item["title"],
                "text": item["description"],
            },
        }
        cards.append(card_data)

    return cards
```

<!-- select-item-code -->

```python
from microsoft.teams.api import MessageExtensionSelectItemInvokeActivity, AttachmentLayout, MessagingExtensionInvokeResponse, MessagingExtensionResult, MessagingExtensionResultType
from microsoft.teams.apps import ActivityContext
# ...

@app.on_message_ext_select_item
async def handle_message_ext_select_item(ctx: ActivityContext[MessageExtensionSelectItemInvokeActivity]):
    option = getattr(ctx.activity.value, "option", None)
    await ctx.send(f"Selected item: {option}")

    result = MessagingExtensionResult(
        type=MessagingExtensionResultType.RESULT, attachment_layout=AttachmentLayout.LIST, attachments=[]
    )

    return MessagingExtensionInvokeResponse(compose_extension=result)
```
