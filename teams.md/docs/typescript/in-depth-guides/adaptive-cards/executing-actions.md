---
sidebar_position: 2
summary: How to implement interactive elements in Adaptive Cards through actions like buttons, links, and input submission triggers.
---

# Executing Actions

Adaptive Cards support interactive elements through **actions**—buttons, links, and input submission triggers that respond to user interaction.  
You can use these to collect form input, trigger workflows, show task modules, open URLs, and more.

---

## Action Types

The Teams AI Library supports several action types for different interaction patterns:

| Action Type               | Purpose                | Description                                                                  |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `Action.Execute`          | Server‑side processing | Send data to your bot for processing. Best for forms & multi‑step workflows. |
| `Action.Submit`           | Simple data submission | Legacy action type. Prefer `Execute` for new projects.                       |
| `Action.OpenUrl`          | External navigation    | Open a URL in the user's browser.                                            |
| `Action.ShowCard`         | Progressive disclosure | Display a nested card when clicked.                                          |
| `Action.ToggleVisibility` | UI state management    | Show/hide card elements dynamically.                                         |

> For complete reference, see the [official documentation](https://adaptivecards.microsoft.com/?topic=Action.Execute).

---

## Creating Actions with the SDK

### Single Actions

The SDK provides builder helpers that abstract the underlying JSON. For example:

```typescript
import { ExecuteAction } from '@microsoft/teams.cards';
// ...

new ExecuteAction({ title: 'Submit Feedback' })
  .withData({ action: 'submit_feedback' })
  .withAssociatedInputs('auto'),
```

### Action Sets

Group actions together using `ActionSet`:

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

### Raw JSON Alternative

Just like when building cards, if you prefer to work with raw JSON, you can do just that. You get typesafety for free in typescript.

```typescript
import { IOpenUrlAction } from '@microsoft/teams.cards';
// ...

{
  type: 'Action.OpenUrl',
  url: 'https://adaptivecards.microsoft.com',
  title: 'Learn More',
} as const satisfies IOpenUrlAction
```

---

## Working with Input Values

### Associating data with the cards

Sometimes you want to send a card and have it be associated with some data. Set the `data` value to be sent back to the client so you can associate it with a particular entity.

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

### Input Validation

Input Controls provide ways for you to validate. More details can be found on the Adaptive Cards [documentation](https://adaptivecards.microsoft.com/?topic=input-validation).

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

---

## Server Handlers

### Basic Structure

Card actions arrive as `card.action` activities in your app. These give you access to the validated input values plus any `data` values you had configured to be sent back to you.

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

:::note
The `data` values are not typed and come as `any`, so you will need to cast them to the correct type in this case.
:::