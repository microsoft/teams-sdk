---
sidebar_position: 1
summary: Learn how to create action commands for message extensions that present modal dialogs to collect or display information in Teams.
---

# Action commands

Action commands allow you to present your users with a modal pop-up called a dialog in Teams. The dialog collects or displays information, processes the interaction, and sends the information back to Teams compose box.

## Action command invocation locations

There are three different areas action commands can be invoked from:

1. Compose Area
2. Compose Box
3. Message

### Compose Area and Box

![Screenshot of Teams with outlines around the 'Compose Box' (for typing messages) and the 'Compose Area' (the menu option next to the compose box that provides a search bar for actions and apps).](/screenshots/compose-area.png)

### Message action command

![Screenshot of message extension response in Teams. By selecting the '...' button, a menu has opened with 'More actions' option in which they can select from a list of available message extension actions.](/screenshots/message.png)

:::tip
See the [Invoke Locations](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command?tabs=Teams-toolkit%2Cdotnet#select-action-command-invoke-locations) guide to learn more about the different entry points for action commands.
:::

## Setting up your Teams app manifest

To use action commands you have define them in the Teams app manifest. Here is an example:


```json
"composeExtensions": [
    {
        "botId": "${{BOT_ID}}",
        "commands": [
            {
            "id": "createCard",
            "type": "action",
            "context": [
                "compose",
                "commandBox"
            ],
            "description": "Command to run action to create a card from the compose box.",
            "title": "Create Card",
            "parameters": [
                {
                    "name": "title",
                    "title": "Card title",
                    "description": "Title for the card",
                    "inputType": "text"
                },
                {
                    "name": "subTitle",
                    "title": "Subtitle",
                    "description": "Subtitle for the card",
                    "inputType": "text"
                },
                {
                    "name": "text",
                    "title": "Text",
                    "description": "Text for the card",
                    "inputType": "textarea"
                }
            ]
            },
            {
                "id": "getMessageDetails",
                "type": "action",
                "context": [
                    "message"
                ],
                "description": "Command to run action on message context.",
                "title": "Get Message Details"
            },
            {
                "id": "fetchConversationMembers",
                "description": "Fetch the conversation members",
                "title": "Fetch Conversation Members",
                "type": "action",
                "fetchTask": true,
                "context": [
                    "compose"
                ]
            },
        ]
    }
]
```


Here we are defining three different commands:

1. `createCard` - that can be invoked from either the `compose` or `commandBox` areas. Upon invocation a dialog will popup asking the user to fill the `title`, `subTitle`, and `text`.

![Screenshot of a message extension dialog with the editable fields 'Card title', 'Subtitle', and 'Text'.](/screenshots/parameters.png)

2. `getMessageDetails` - It is invoked from the `message` overflow menu. Upon invocation the message payload will be sent to the app which will then return the details like `createdDate`...etc.

![Screenshot of the 'More actions' message extension menu expanded with 'Get Message Details' option selected.](/screenshots/message-command.png)

3. `fetchConversationMembers` - It is invoked from the `compose` area. Upon invocation the app will return an adaptive card in the form of a dialog with the conversation roster.

![Screenshot of the 'Fetch Conversation Members' option exposed from the message extension menu '...' option.](/screenshots/fetch-conversation-members.png)

## Handle submission

Handle submission when the `createCard` or `getMessageDetails` actions commands are invoked.

```python
from microsoft.teams.api import AdaptiveCardAttachment, MessageExtensionSubmitActionInvokeActivity, card_attachment
from microsoft.teams.api.models import AttachmentLayout, MessagingExtensionActionInvokeResponse, MessagingExtensionAttachment, MessagingExtensionResult, MessagingExtensionResultType
from microsoft.teams.apps import ActivityContext
# ...

@app.on_message_ext_submit
async def handle_message_ext_submit(ctx: ActivityContext[MessageExtensionSubmitActionInvokeActivity]):
    command_id = ctx.activity.value.command_id

    if command_id == "createCard":
        card = create_card(ctx.activity.value.data or {})
    elif command_id == "getMessageDetails" and ctx.activity.value.message_payload:
        card = create_message_details_card(ctx.activity.value.message_payload)
    else:
        raise Exception(f"Unknown commandId: {command_id}")

    main_attachment = card_attachment(AdaptiveCardAttachment(content=card))
    attachment = MessagingExtensionAttachment(
        content_type=main_attachment.content_type, content=main_attachment.content
    )

    result = MessagingExtensionResult(
        type=MessagingExtensionResultType.RESULT, attachment_layout=AttachmentLayout.LIST, attachments=[attachment]
    )

    return MessagingExtensionActionInvokeResponse(compose_extension=result)
```

`create_card()` method

```py
from typing import Dict
from microsoft.teams.cards import AdaptiveCard
# ...

def create_card(data: Dict[str, str]) -> AdaptiveCard:
    """Create an adaptive card from form data."""
    return AdaptiveCard.model_validate(
        {
            "type": "AdaptiveCard",
            "version": "1.4",
            "body": [
                {"type": "Image", "url": IMAGE_URL},
                {
                    "type": "TextBlock",
                    "text": data.get("title", ""),
                    "size": "Large",
                    "weight": "Bolder",
                    "color": "Accent",
                    "style": "heading",
                },
                {
                    "type": "TextBlock",
                    "text": data.get("subTitle", ""),
                    "size": "Small",
                    "weight": "Lighter",
                    "color": "Good",
                },
                {"type": "TextBlock", "text": data.get("text", ""), "wrap": True, "spacing": "Medium"},
            ],
        }
    )

```

`create_message_details_card()` method

```python
from typing import Dict, List, Union
from microsoft.teams.api.models.message import Message
from microsoft.teams.cards import AdaptiveCard
# ...

def create_message_details_card(message_payload: Message) -> AdaptiveCard:
    """Create a card showing message details."""
    body: List[Dict[str, Union[str, bool]]] = [
        {
            "type": "TextBlock",
            "text": "Message Details",
            "size": "Large",
            "weight": "Bolder",
            "color": "Accent",
            "style": "heading",
        }
    ]

    if message_payload.body and message_payload.body.content:
        content_blocks: List[Dict[str, Union[str, bool]]] = [
            {"type": "TextBlock", "text": "Content", "size": "Medium", "weight": "Bolder", "spacing": "Medium"},
            {"type": "TextBlock", "text": message_payload.body.content},
        ]
        body.extend(content_blocks)

    if message_payload.attachments:
        attachment_blocks: List[Dict[str, Union[str, bool]]] = [
            {"type": "TextBlock", "text": "Attachments", "size": "Medium", "weight": "Bolder", "spacing": "Medium"},
            {
                "type": "TextBlock",
                "text": f"Number of attachments: {len(message_payload.attachments)}",
                "wrap": True,
                "spacing": "Small",
            },
        ]
        body.extend(attachment_blocks)

    if message_payload.created_date_time:
        date_blocks: List[Dict[str, Union[str, bool]]] = [
            {"type": "TextBlock", "text": "Created Date", "size": "Medium", "weight": "Bolder", "spacing": "Medium"},
            {"type": "TextBlock", "text": message_payload.created_date_time, "wrap": True, "spacing": "Small"},
        ]
        body.extend(date_blocks)

    if message_payload.link_to_message:
        link_blocks: List[Dict[str, Union[str, bool]]] = [
            {"type": "TextBlock", "text": "Message Link", "size": "Medium", "weight": "Bolder", "spacing": "Medium"}
        ]
        body.extend(link_blocks)

        actions = [{"type": "Action.OpenUrl", "title": "Go to message", "url": message_payload.link_to_message}]
    else:
        actions = []

    return AdaptiveCard.model_validate({"type": "AdaptiveCard", "version": "1.4", "body": body, "actions": actions})
```


## Handle opening adaptive card dialog

Handle opening adaptive card dialog when the `fetchConversationMembers` command is invoked.

```python
from microsoft.teams.api import AdaptiveCardAttachment, MessageExtensionFetchTaskInvokeActivity, card_attachment
from microsoft.teams.api.models import CardTaskModuleTaskInfo, MessagingExtensionActionInvokeResponse, TaskModuleContinueResponse
from microsoft.teams.apps import ActivityContext
# ...

@app.on_message_ext_open
async def handle_message_ext_open(ctx: ActivityContext[MessageExtensionFetchTaskInvokeActivity]):
    conversation_id = ctx.activity.conversation.id
    members = await ctx.api.conversations.members(conversation_id).get_all()
    card = create_conversation_members_card(members)

    card_info = CardTaskModuleTaskInfo(
        title="Conversation members",
        height="small",
        width="small",
        card=card_attachment(AdaptiveCardAttachment(content=card)),
    )

    task = TaskModuleContinueResponse(value=card_info)

    return MessagingExtensionActionInvokeResponse(task=task)
```

`create_conversation_members_card()` method

```python
from typing import List
from microsoft.teams.api import Account
from microsoft.teams.cards import AdaptiveCard
# ...

def create_conversation_members_card(members: List[Account]) -> AdaptiveCard:
    """Create a card showing conversation members."""
    members_list = ", ".join(member.name for member in members if member.name)

    return AdaptiveCard.model_validate(
        {
            "type": "AdaptiveCard",
            "version": "1.4",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "Conversation members",
                    "size": "Medium",
                    "weight": "Bolder",
                    "color": "Accent",
                    "style": "heading",
                },
                {"type": "TextBlock", "text": members_list, "wrap": True, "spacing": "Small"},
            ],
        }
    )
```

## Resources

- [Action commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command?tabs=Teams-toolkit%2Cdotnet)
- [Returning Adaptive Card Previews in Task Modules](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/respond-to-task-module-submit?tabs=dotnet%2Cdotnet-1#bot-response-with-adaptive-card)
