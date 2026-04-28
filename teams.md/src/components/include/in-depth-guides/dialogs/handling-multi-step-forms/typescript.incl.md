<!-- initial-setup -->

Start by returning the first step's card from the `dialog.open` handler.

<!-- initial-card -->

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { AdaptiveCard, TextInput, SubmitAction, SubmitData } from '@microsoft/teams.cards';
// ...

app.on('dialog.open.multi_step_form', async () => {
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
  ).withActions(
    // Route to a step-specific submit handler
    new SubmitAction()
      .withTitle('Submit')
      .withData(new SubmitData('multi_step_1'))
  );

  return {
    task: {
      type: 'continue',
      value: {
        title: 'Multi-step Form Dialog',
        card: cardAttachment('adaptive', dialogCard),
      },
    },
  };
});
```

<!-- submission-handler -->

Then in the submission handler, return `type: 'continue'` with the next card to keep the dialog open. Pass state forward using `SubmitData`'s extra data parameter.

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
import { AdaptiveCard, TextInput, SubmitAction, SubmitData } from '@microsoft/teams.cards';
// ...

// Step 1 submit — show step 2
app.on('dialog.submit.multi_step_1', async ({ activity }) => {
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
    new SubmitAction().withTitle('Submit').withData(
      // Carry forward data from step 1 via extra data
      new SubmitData('multi_step_2', { name })
    )
  );

  return {
    task: {
      type: 'continue',
      value: {
        title: `Thanks ${name} - Get Email`,
        card: cardAttachment('adaptive', nextStepCard),
      },
    },
  };
});

// Step 2 submit — final step, close the dialog
app.on('dialog.submit.multi_step_2', async ({ activity, send }) => {
  const name = activity.value.data.name;
  const email = activity.value.data.email;
  await send(`Hi ${name}, thanks for submitting the form! We got that your email is ${email}`);
  return { status: 200 };
});
```

<!-- complete-example -->

N/A
