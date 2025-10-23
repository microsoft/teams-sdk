<!-- package-name -->

`@microsoft/teams.cards`

<!-- intro-description -->

With `@microsoft/teams.cards` you can build these cards entirely in TypeScript/JavaScript while enjoying full IntelliSense and compiler safety.

<!-- builder-description -->

`@microsoft/teams.cards` exposes small **builder helpers** including `Card`, `TextBlock`, `ToggleInput`, `ExecuteAction`, _etc._

<!-- language-name -->

TypeScript/JavaScript

<!-- builder-example -->

```ts
import {
  AdaptiveCard,
  TextBlock,
  ToggleInput,
  ExecuteAction,
  ActionSet,
} from '@microsoft/teams.cards';

const card = new AdaptiveCard(
  new TextBlock('Hello world', { wrap: true, weight: 'Bolder' }),
  new ToggleInput('Notify me').withId('notify'),
  new ActionSet(
    new ExecuteAction({ title: 'Submit' })
      .withData({ action: 'submit_basic' })
      .withAssociatedInputs('auto')
  )
);
```

<!-- source-code-note -->

:::info
Source code lives in `teams.ts/packages/cards/src/`. Feel free to inspect or extend the helpers for your own needs.
:::

<!-- type-safety-example -->

```typescript
// @ts-expect-error: "huge" is not a valid size for TextBlock
const textBlock = new TextBlock('Valid', { size: 'huge' });
```

<!-- additional-type-info -->

<!-- designer-example -->

```typescript
const cardJson = /* copied JSON */;
const card = new AdaptiveCard().withBody(cardJson);
```

```ts
const rawCard: IAdaptiveCard = {
  type: 'AdaptiveCard',
  body: [
    {
      text: 'Please fill out the below form to send a game purchase request.',
      wrap: true,
      type: 'TextBlock',
      style: 'heading',
    },
    {
      columns: [
        {
          width: 'stretch',
          items: [
            {
              choices: [
                { title: 'Call of Duty', value: 'call_of_duty' },
                { title: "Death's Door", value: 'deaths_door' },
                { title: 'Grand Theft Auto V', value: 'grand_theft' },
                { title: 'Minecraft', value: 'minecraft' },
              ],
              style: 'filtered',
              placeholder: 'Search for a game',
              id: 'choiceGameSingle',
              type: 'Input.ChoiceSet',
              label: 'Game:',
            },
          ],
          type: 'Column',
        },
      ],
      type: 'ColumnSet',
    },
  ],
  actions: [
    {
      title: 'Request purchase',
      type: 'Action.Execute',
      data: { action: 'purchase_item' },
    },
  ],
  version: '1.5',
};
```

<!-- card-interface -->

`IAdaptiveCard`

<!-- example-intro -->

Notice how the builder pattern keeps the file readable and maintainable:

<!-- task-form-example -->

```ts
import {
  AdaptiveCard,
  TextBlock,
  TextInput,
  ChoiceSetInput,
  DateInput,
  ActionSet,
  ExecuteAction,
} from '@microsoft/teams.cards';
import { App } from '@microsoft/teams.apps';
// ...

app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });
  const card = new AdaptiveCard(
    new TextBlock('Create New Task', {
      size: 'Large',
      weight: 'Bolder',
    }),
    new TextInput({ id: 'title' }).withLabel('Task Title').withPlaceholder('Enter task title'),
    new TextInput({ id: 'description' })
      .withLabel('Description')
      .withPlaceholder('Enter task details')
      .withIsMultiline(true),
    new ChoiceSetInput(
      { title: 'High', value: 'high' },
      { title: 'Medium', value: 'medium' },
      { title: 'Low', value: 'low' }
    )
      .withId('priority')
      .withLabel('Priority')
      .withValue('medium'),
    new DateInput({ id: 'due_date' })
      .withLabel('Due Date')
      .withValue(new Date().toISOString().split('T')[0]),
    new ActionSet(
      new ExecuteAction({ title: 'Create Task' })
        .withData({ action: 'create_task' })
        .withAssociatedInputs('auto')
        .withStyle('positive')
    )
  );
  await send(card);
  // Or build a complex activity out that includes the card:
  // const message  = new MessageActivity('Enter this form').addCard('adaptive', card);
  // await send(message);
});
```
