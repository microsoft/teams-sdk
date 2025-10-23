<!-- initial-setup -->

Start off by sending an initial card in the `dialog.open` event.

<!-- initial-card -->

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { AdaptiveCard, TextInput, SubmitAction } from '@microsoft/teams.cards';
// ...

const dialogCard = new AdaptiveCard(
  {
    type: 'TextBlock',
    text: 'This is a multi-step form',
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
    new SubmitAction()
      .withTitle('Submit')
      .withData({ submissiondialogtype: 'webpage_dialog_step_1' })
  );

// Return an object with the task value that renders a card
return {
  task: {
    type: 'continue',
    value: {
      title: 'Multi-step Form Dialog',
      card: cardAttachment('adaptive', dialogCard),
    },
  },
};
```

<!-- submission-handler -->

Then in the submission handler, you can choose to `continue` the dialog with a different card.

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
import { AdaptiveCard, TextInput, SubmitAction } from '@microsoft/teams.cards';
// ...

app.on('dialog.submit', async ({ activity, send, next }) => {
  const dialogType = activity.value.data.submissiondialogtype;

  if (dialogType === 'webpage_dialog_step_1') {
    // This is data from the form that was submitted
    const name = activity.value.data.name;
    const nextStepCard = new AdaptiveCard(
      {
        type: 'TextBlock',
        text: 'Email',
        size: 'Large',
        weight: 'Bolder',
      },
      new TextInput()
        .withLabel('Email')
        .withIsRequired()
        .withId('email')
        .withPlaceholder('Enter your email')
    ).withActions(
      new SubmitAction().withTitle('Submit').withData({
        // This same handler will get called, so we need to identify the step
        // in the returned data
        submissiondialogtype: 'webpage_dialog_step_2',
        // Carry forward data from previous step
        name,
      })
    );
    return {
      task: {
        // This indicates that the dialog flow should continue
        type: 'continue',
        value: {
          // Here we customize the title based on the previous response
          title: `Thanks ${name} - Get Email`,
          card: cardAttachment('adaptive', nextStepCard),
        },
      },
    };
  } else if (dialogType === 'webpage_dialog_step_2') {
    const name = activity.value.data.name;
    const email = activity.value.data.email;
    await send(`Hi ${name}, thanks for submitting the form! We got that your email is ${email}`);
    // You can also return a blank response
    return {
      status: 200,
    };
  }
});
```

<!-- complete-example -->

N/A
