<!-- single-action-example -->

```typescript
import { ExecuteAction } from '@microsoft/teams.cards';
// ...

new ExecuteAction({ title: 'Submit Feedback' })
  .withData({ action: 'submit_feedback' })
  .withAssociatedInputs('auto'),
```

<!-- action-set-example -->

```typescript
import { ExecuteAction, OpenUrlAction, ActionSet } from '@microsoft/teams.cards';
// ...

new ActionSet(
  new ExecuteAction({ title: 'Submit Feedback' })
    .withData({ action: 'submit_feedback' })
    .withAssociatedInputs('auto'),
  new OpenUrlAction('https://adaptivecards.microsoft.com').withTitle(
    'Learn More'
  )
)
```

<!-- json-safety-note -->

You get type safety for free in TypeScript.

<!-- raw-json-example -->

```typescript
import { IOpenUrlAction } from '@microsoft/teams.cards';
// ...

{
  type: 'Action.OpenUrl',
  url: 'https://adaptivecards.microsoft.com',
  title: 'Learn More',
} as const satisfies IOpenUrlAction
```

<!-- input-association-example -->

```typescript
import { AdaptiveCard, TextInput, ToggleInput, ActionSet, ExecuteAction } from '@microsoft/teams.cards';
// ...

function editProfileCard() {
  const card = new AdaptiveCard(
    new TextInput({ id: 'name' }).withLabel('Name').withValue('John Doe'),
    new TextInput({ id: 'email', label: 'Email', value: 'john@contoso.com' }),
    new ToggleInput('Subscribe to newsletter')
      .withId('subscribe')
      .withValue('false'),
    new ActionSet(
      new ExecuteAction({ title: 'Save' })
        .withData({
          action: 'save_profile',
          entityId: '12345', // This will come back once the user submits
        })
        .withAssociatedInputs('auto')
    )
  );

  // Data received in handler
  /**
  {
    action: "save_profile",
    entityId: "12345",     // From action data
    name: "John Doe",      // From name input
    email: "john@doe.com", // From email input
    subscribe: "true"      // From toggle input (as string)
  }
  */

  return card;
}
```

<!-- input-validation-example -->

```typescript
import { AdaptiveCard, NumberInput, TextInput, ActionSet, ExecuteAction } from '@microsoft/teams.cards';
// ...

function createProfileCardInputValidation() {
  const ageInput = new NumberInput({ id: 'age' })
    .withLabel('Age')
    .withIsRequired(true)
    .withMin(0)
    .withMax(120);

  const nameInput = new TextInput({ id: 'name' })
    .withLabel('Name')
    .withIsRequired()
    .withErrorMessage('Name is required!'); // Custom error messages
  const card = new AdaptiveCard(
    nameInput,
    ageInput,
    new TextInput({ id: 'location' }).withLabel('Location'),
    new ActionSet(
      new ExecuteAction({ title: 'Save' })
        .withData({
          action: 'save_profile',
        })
        .withAssociatedInputs('auto') // All inputs should be validated
    )
  );

  return card;
}
```

<!-- server-handler-example -->

```typescript
import { AdaptiveCardActionErrorResponse, AdaptiveCardActionMessageResponse } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
// ...

app.on('card.action', async ({ activity, send }) => {
  const data = activity.value?.action?.data;
  if (!data?.action) {
    return {
      statusCode: 400,
      type: 'application/vnd.microsoft.error',
      value: {
        code: 'BadRequest',
        message: 'No action specified',
        innerHttpError: {
          statusCode: 400,
          body: { error: 'No action specified' },
        },
      },
    } satisfies AdaptiveCardActionErrorResponse;
  }

  console.debug('Received action data:', data);

  switch (data.action) {
    case 'submit_feedback':
      await send(`Feedback received: ${data.feedback}`);
      break;

    case 'purchase_item':
      await send(
        `Purchase request received for game: ${data.choiceGameSingle}`
      );
      break;

    case 'save_profile':
      await send(
        `Profile saved!\nName: ${data.name}\nEmail: ${data.email}\nSubscribed: ${data.subscribe}`
      );
      break;

    default:
      return {
        statusCode: 400,
        type: 'application/vnd.microsoft.error',
        value: {
          code: 'BadRequest',
          message: 'Unknown action',
          innerHttpError: {
            statusCode: 400,
            body: { error: 'Unknown action' },
          },
        },
      } satisfies AdaptiveCardActionErrorResponse;
  }

  return {
    statusCode: 200,
    type: 'application/vnd.microsoft.activity.message',
    value: 'Action processed successfully',
  } satisfies AdaptiveCardActionMessageResponse;
});
```

<!-- data-typing-note -->

:::note
The `data` values are not typed and come as `any`, so you will need to cast them to the correct type in this case.
:::