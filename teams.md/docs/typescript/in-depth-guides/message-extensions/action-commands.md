---
sidebar_position: 1
summary: How to implement action commands in message extensions to present users with modal dialogs for collecting and processing information.
---

# Action commands

Action commands allow you to present your users with a modal pop-up called as dialog in Teams. The dialog collects or displays information, processes the interaction, and sends the information back to Teams compose box.

## Action command invocation locations

There are three different areas from which action commands can be invoked from:

1. Compose Area
2. Compose Box
3. Message

### Compose Area and Box

![compose area and box](/screenshots/compose-area.png)

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

2. `getMessageDetails` - It is invoked from the `message` overflow menu. Upon invocation the message payload will be sent to the app which will then return the details like `createdDate`,etc.

![Screenshot of the 'More actions' message extension menu expanded with 'Get Message Details' option selected.](/screenshots/message-command.png)

3. `fetchConversationMembers` - It is invoked from the `compose` area. Upon invocation the app will return an adaptive card in the form of a dialog with the conversation roster.

![Screenshot of the 'Fetch Conversation Members' option exposed from the message extension menu '...' option.](/screenshots/fetch-conversation-members.png)

## Handle submission

Handle submission when the `createCard` or `getMessageDetails` action commands are invoked.

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
import { IAdaptiveCard } from '@microsoft/teams.cards';
// ...

app.on('message.ext.submit', async ({ activity }) => {
  const { commandId } = activity.value;
  let card: IAdaptiveCard;

  if (commandId === 'createCard') {
    // The activity.value.commandContext == "compose" here because it was from
    // the compose box
    card = createCard(activity.value.data);
  } else if (
    commandId === 'getMessageDetails' &&
    activity.value.messagePayload
  ) {
    // The activity.value.commandContext == "message" here because it was from
    // the message context
    card = createMessageDetailsCard(activity.value.messagePayload);
  } else {
    throw new Error(`Unknown commandId: ${commandId}`);
  }

  return {
    composeExtension: {
      type: 'result',
      attachmentLayout: 'list',
      attachments: [cardAttachment('adaptive', card)],
    },
  };
});
```

`createCard()` function

```typescript
import { AdaptiveCard, TextBlock, Image } from '@microsoft/teams.cards';
// ...

interface IFormData {
  title: string;
  subtitle: string;
  text: string;
}

export function createCard(data: IFormData) {
  return new AdaptiveCard(
    new Image(IMAGE_URL),
    new TextBlock(data.title, {
      size: 'Large',
      weight: 'Bolder',
      color: 'Accent',
      style: 'heading',
    }),
    new TextBlock(data.subtitle, {
      size: 'Small',
      weight: 'Lighter',
      color: 'Good',
    }),
    new TextBlock(data.text, {
      wrap: true,
      spacing: 'Medium',
    })
  );
}
```

`createMessageDetailsCard()` function

```typescript
import { Message } from '@microsoft/teams.api';
import { AdaptiveCard, CardElement, TextBlock, ActionSet, OpenUrlAction } from '@microsoft/teams.cards';
// ...

export function createMessageDetailsCard(messagePayload: Message) {
  const cardElements: CardElement[] = [
    new TextBlock('Message Details', {
      size: 'Large',
      weight: 'Bolder',
      color: 'Accent',
      style: 'heading',
    }),
  ];

  if (messagePayload?.body?.content) {
    cardElements.push(
      new TextBlock('Content', {
        size: 'Medium',
        weight: 'Bolder',
        spacing: 'Medium',
      }),
      new TextBlock(messagePayload.body.content)
    );
  }

  if (messagePayload?.attachments?.length) {
    cardElements.push(
      new TextBlock('Attachments', {
        size: 'Medium',
        weight: 'Bolder',
        spacing: 'Medium',
      }),
      new TextBlock(
        `Number of attachments: ${messagePayload.attachments.length}`,
        {
          wrap: true,
          spacing: 'Small',
        }
      )
    );
  }

  if (messagePayload?.createdDateTime) {
    cardElements.push(
      new TextBlock('Created Date', {
        size: 'Medium',
        weight: 'Bolder',
        spacing: 'Medium',
      }),
      new TextBlock(messagePayload.createdDateTime, {
        wrap: true,
        spacing: 'Small',
      })
    );
  }

  if (messagePayload?.linkToMessage) {
    cardElements.push(
      new TextBlock('Message Link', {
        size: 'Medium',
        weight: 'Bolder',
        spacing: 'Medium',
      }),
      new ActionSet(
        new OpenUrlAction(messagePayload.linkToMessage, {
          title: 'Go to message',
        })
      )
    );
  }

  return new AdaptiveCard(...cardElements);
}
```

## Handle opening adaptive card dialog

Handle opening adaptive card dialog when the `fetchConversationMembers` command is invoked.

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
// ...

app.on('message.ext.open', async ({ activity, api }) => {
  const conversationId = activity.conversation.id;
  const members = await api.conversations.members(conversationId).get();
  const card = createConversationMembersCard(members);

  return {
    task: {
      type: 'continue',
      value: {
        title: 'Conversation members',
        height: 'small',
        width: 'small',
        card: cardAttachment('adaptive', card),
      },
    },
  };
});
```

`createConversationMembersCard()` function

```typescript
import { Account } from '@microsoft/teams.api';
import { AdaptiveCard, TextBlock } from '@microsoft/teams.cards';
// ...

export function createConversationMembersCard(members: Account[]) {
  const membersList = members.map((member) => member.name).join(', ');

  return new AdaptiveCard(
    new TextBlock('Conversation members', {
      size: 'Medium',
      weight: 'Bolder',
      color: 'Accent',
      style: 'heading',
    }),
    new TextBlock(membersList, {
      wrap: true,
      spacing: 'Small',
    })
  );
}
```

## Resources

- [Action commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command?tabs=Teams-toolkit%2Cdotnet)
- [Returning Adaptive Card Previews in Task Modules](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/respond-to-task-module-submit?tabs=dotnet%2Cdotnet-1#bot-response-with-adaptive-card)
