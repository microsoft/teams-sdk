<!-- entry-point-intro -->

To open a dialog, you need to supply a special type of action as to the Adaptive Card. Once this button is clicked, the dialog will open and ask the application what to show.

<!-- entry-point-code -->

```typescript
import { cardAttachment, MessageActivity } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
import {
  AdaptiveCard,
  IAdaptiveCard,
  TaskFetchAction,
  TaskFetchData,
} from '@microsoft/teams.cards';
// ...

app.on('message', async ({ send }) => {
  await send({ type: 'typing' });

  // Create the launcher adaptive card
  const card: IAdaptiveCard = new AdaptiveCard({
    type: 'TextBlock',
    text: 'Select the examples you want to see!',
    size: 'Large',
    weight: 'Bolder',
  }).withActions(
    // raw action
    {
      type: 'Action.Submit',
      title: 'Simple form test',
      data: {
        msteams: {
          type: 'task/fetch',
        },
        opendialogtype: 'simple_form',
      },
    },
    // Special type of action to open a dialog
    new TaskFetchAction({})
      .withTitle('Webpage Dialog')
      // This data will be passed back in an event so we can
      // handle what to show in the dialog
      .withValue(new TaskFetchData({ opendialogtype: 'webpage_dialog' })),
    new TaskFetchAction({})
      .withTitle('Multi-step Form')
      .withValue(new TaskFetchData({ opendialogtype: 'multi_step_form' })),
    new TaskFetchAction({})
      .withTitle('Mixed Example')
      .withValue(new TaskFetchData({ opendialogtype: 'mixed_example' }))
  );

  // Send the card as an attachment
  await send(new MessageActivity('Enter this form').addCard('adaptive', card));
});
```

<!-- dialog-open-intro -->

Once an action is executed to open a dialog, the Teams client will send an event to the agent to request what the content of the dialog should be. Here is how to handle this event:

<!-- dialog-open-code -->

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
import { AdaptiveCard, IAdaptiveCard } from '@microsoft/teams.cards';
// ...

app.on('dialog.open', async ({ activity }) => {
  const card: IAdaptiveCard = new AdaptiveCard()...

  // Return an object with the task value that renders a card
  return {
    task: {
      type: 'continue',
      value: {
        title: 'Title of Dialog',
        card: cardAttachment('adaptive', card),
      },
    },
  };
}
```

<!-- rendering-card-code -->

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { AdaptiveCard, TextInput, SubmitAction } from '@microsoft/teams.cards';
// ...

if (dialogType === 'simple_form') {
  const dialogCard = new AdaptiveCard(
    {
      type: 'TextBlock',
      text: 'This is a simple form',
      size: 'Large',
      weight: 'Bolder',
    },
    new TextInput()
      .withLabel('Name')
      .withIsRequired()
      .withId('name')
      .withPlaceholder('Enter your name')
  )
    // Inside the dialog, the card actions for submitting the card must be
    // of type Action.Submit
    .withActions(
      new SubmitAction().withTitle('Submit').withData({ submissiondialogtype: 'simple_form' })
    );

  // Return an object with the task value that renders a card
  return {
    task: {
      type: 'continue',
      value: {
        title: 'Simple Form Dialog',
        card: cardAttachment('adaptive', dialogCard),
      },
    },
  };
}
```

<!-- rendering-webpage-code -->

```typescript
import { App } from '@microsoft/teams.apps';
// ...

return {
  task: {
    type: 'continue',
    value: {
      title: 'Webpage Dialog',
      // Here we are using a webpage that is hosted in the same
      // server as the agent. This server needs to be publicly accessible,
      // needs to set up teams.js client library (https://www.npmjs.com/package/@microsoft/teams-js)
      // and needs to be registered in the manifest.
      url: `${process.env['BOT_ENDPOINT']}/tabs/dialog-form`,
      width: 1000,
      height: 800,
    },
  },
};
```

<!-- embedded-web-content -->

### Setting up Embedded Web Content

To serve web content for dialogs, you can use the `tab` method to host static webpages:

```typescript
import path from 'path';
import { App } from '@microsoft/teams.apps';

// Hosts a static webpage at /tabs/dialog-form
app.tab('dialog-form', path.join(__dirname, 'views', 'customform'));
```
