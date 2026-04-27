<!-- entry-point-intro -->

To open a dialog, add a button to your Adaptive Card using `OpenDialogData`. This sets up the `task/fetch` protocol and includes a `dialog_id` that the SDK uses to route to the correct handler.

<!-- entry-point-code -->

```typescript
import { cardAttachment, MessageActivity } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
import {
  AdaptiveCard,
  IAdaptiveCard,
  OpenDialogData,
  SubmitAction,
} from '@microsoft/teams.cards';
// ...

app.on('message', async ({ send }) => {
  await send({ type: 'typing' });

  const card: IAdaptiveCard = new AdaptiveCard({
    type: 'TextBlock',
    text: 'Select the examples you want to see!',
    size: 'Large',
    weight: 'Bolder',
  }).withActions(
    // OpenDialogData sets msteams.type = "task/fetch" and adds dialog_id for routing
    new SubmitAction()
      .withTitle('Simple form test')
      .withData(new OpenDialogData('simple_form')),
    new SubmitAction()
      .withTitle('Webpage Dialog')
      .withData(new OpenDialogData('webpage_dialog')),
    new SubmitAction()
      .withTitle('Multi-step Form')
      .withData(new OpenDialogData('multi_step_form'))
  );

  await send(new MessageActivity('Enter this form').addCard('adaptive', card));
});
```

<!-- dialog-open-intro -->

When a user clicks the button, Teams sends a `task/fetch` invoke to your app. Register a handler using `dialog.open.<dialog_id>` to handle a specific dialog, or `dialog.open` for a catch-all:

<!-- dialog-open-code -->

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
import { AdaptiveCard, IAdaptiveCard } from '@microsoft/teams.cards';
// ...

// Handle a specific dialog by ID — no if-else needed
app.on('dialog.open.simple_form', async ({ activity }) => {
  const card: IAdaptiveCard = new AdaptiveCard()...

  return {
    task: {
      type: 'continue',
      value: {
        title: 'Title of Dialog',
        card: cardAttachment('adaptive', card),
      },
    },
  };
});
```

<!-- rendering-card-code -->

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { AdaptiveCard, TextInput, SubmitAction, SubmitData } from '@microsoft/teams.cards';
// ...

app.on('dialog.open.simple_form', async () => {
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
    // Use SubmitData to set the "action" field, which routes to dialog.submit.<action>
    .withActions(
      new SubmitAction().withTitle('Submit').withData(new SubmitData('simple_form'))
    );

  return {
    task: {
      type: 'continue',
      value: {
        title: 'Simple Form Dialog',
        card: cardAttachment('adaptive', dialogCard),
      },
    },
  };
});
```

<!-- rendering-webpage-code -->

```typescript
import { App } from '@microsoft/teams.apps';
// ...

app.on('dialog.open.webpage_dialog', async () => {
  return {
    task: {
      type: 'continue',
      value: {
        title: 'Webpage Dialog',
        // The webpage must be publicly accessible, use the teams-js client library,
        // and be registered in validDomains in the manifest.
        url: `${process.env['BOT_ENDPOINT']}/tabs/dialog-form`,
        width: 1000,
        height: 800,
      },
    },
  };
});
```

<!-- embedded-web-content -->

### Setting up Embedded Web Content

To serve web content for dialogs, you can use the `tab` method to host static webpages:

```typescript
import path from 'path';

// In your app setup (e.g., index.ts)
// Hosts a static webpage at /tabs/dialog-form
app.tab('dialog-form', path.join(__dirname, 'views', 'customform'));
```
