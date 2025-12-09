<!-- handle-submission-intro -->

Handle submission when the `createCard` or `getMessageDetails` actions commands are invoked.

<!-- handle-submission-code -->

```python
from microsoft_teams.api import AdaptiveCardAttachment, MessageExtensionSubmitActionInvokeActivity, card_attachment
from microsoft_teams.api.models import AttachmentLayout, MessagingExtensionActionInvokeResponse, MessagingExtensionAttachment, MessagingExtensionResult, MessagingExtensionResultType
from microsoft_teams.apps import ActivityContext
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

<!-- create-card-function -->

`create_card()` method

```py
from typing import Dict
from microsoft_teams.cards import AdaptiveCard
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

<!-- create-message-details-function -->

`create_message_details_card()` method

```python
from typing import Dict, List, Union
from microsoft_teams.api.models.message import Message
from microsoft_teams.cards import AdaptiveCard
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

<!-- handle-dialog-intro -->

Handle opening adaptive card dialog when the `fetchConversationMembers` command is invoked.

<!-- handle-dialog-code -->

```python
from microsoft_teams.api import AdaptiveCardAttachment, MessageExtensionFetchTaskInvokeActivity, card_attachment
from microsoft_teams.api.models import CardTaskModuleTaskInfo, MessagingExtensionActionInvokeResponse, TaskModuleContinueResponse
from microsoft_teams.apps import ActivityContext
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

<!-- create-conversation-members-function -->

`create_conversation_members_card()` method

```python
from typing import List
from microsoft_teams.api import Account
from microsoft_teams.cards import AdaptiveCard
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
