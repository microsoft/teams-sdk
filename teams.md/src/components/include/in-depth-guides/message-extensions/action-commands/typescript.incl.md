<!-- handle-submission-intro -->

Handle submission when the `createCard` or `getMessageDetails` action commands are invoked.

<!-- handle-submission-code -->

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
  } else if (commandId === 'getMessageDetails' && activity.value.messagePayload) {
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

<!-- create-card-function -->

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

<!-- create-message-details-function -->

`createMessageDetailsCard()` function

```typescript
import { Message } from '@microsoft/teams.api';
import {
  AdaptiveCard,
  CardElement,
  TextBlock,
  ActionSet,
  OpenUrlAction,
} from '@microsoft/teams.cards';
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
      new TextBlock(`Number of attachments: ${messagePayload.attachments.length}`, {
        wrap: true,
        spacing: 'Small',
      })
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

<!-- handle-dialog-intro -->

Handle opening adaptive card dialog when the `fetchConversationMembers` command is invoked.

<!-- handle-dialog-code -->

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

<!-- create-conversation-members-function -->

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
