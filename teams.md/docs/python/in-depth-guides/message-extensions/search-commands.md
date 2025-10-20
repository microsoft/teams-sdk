---
sidebar_position: 2
summary: Create search commands that allow users to search external systems and insert results as cards in Teams messages.
---

# 🔍 Search commands

Message extension search commands allow users to search external systems and insert the results of that search into a message in the form of a card.

## Search command invocation locations

There are three different areas search commands can be invoked from:

1. Compose Area
2. Compose Box

### Compose Area and Box

![Screenshot of Teams with outlines around the 'Compose Box' (for typing messages) and the 'Compose Area' (the menu option next to the compose box that provides a search bar for actions and apps).](/screenshots/compose-area.png)

## Setting up your Teams app manifest

To use search commands you have define them in the Teams app manifest. Here is an example:


```json
"composeExtensions": [
    {
        "botId": "${{BOT_ID}}",
        "commands": [
            {
                "id": "searchQuery",
                "context": [
                    "compose",
                    "commandBox"
                ],
                "description": "Test command to run query",
                "title": "Search query",
                "type": "query",
                "parameters": [
                    {
                        "name": "searchQuery",
                        "title": "Search Query",
                        "description": "Your search query",
                        "inputType": "text"
                    }
                ]
            }
        ]
    }
]
```


Here we are defining the `searchQuery` search (or query) command.

## Handle submission

Handle opening adaptive card dialog when the `searchQuery` query is submitted.

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

The search results include both a full adaptive card and a preview card. The preview card appears as a list item in the search command area:

![Screenshot of Teams showing a message extensions search menu open with list of search results displayed as preview cards.](/screenshots/preview-card.png)

When a user clicks on a list item the dummy adaptive card is added to the compose box:

![Screenshot of Teams showing the selected adaptive card added to the compose box.](/screenshots/card-in-compose.png)

To implement custom actions when a user clicks on a search result item, you can add the `tap` property to the preview card. This allows you to handle the click event with custom logic:

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

## Resources

- [Search command](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/define-search-command?tabs=Teams-toolkit%2Cdotnet)
- [Just-In-Time Install](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/universal-actions-for-search-based-message-extensions#just-in-time-install)
