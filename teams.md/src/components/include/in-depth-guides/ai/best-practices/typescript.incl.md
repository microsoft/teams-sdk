<!-- ai-generated-method -->

This can be done by adding a `addAiGenerated` property to outgoing message.

<!-- ai-generated-code -->

```typescript
const messageToBeSent = new MessageActivity('Hello!').addAiGenerated();
```

<!-- citations-method -->

This is easy to do by simply using the `addCitations` method on the message. This will add a citation to the message, and the LLM will be able to use it to generate a citation for the user.

<!-- citations-code -->

```typescript
import { MessageActivity } from '@microsoft/teams.api';
// ...

const messageActivity = new MessageActivity(result.content).addAiGenerated();
for (let i = 0; i < citedDocs.length; i++) {
  const doc = citedDocs[i];
  // The corresponding citation needs to be added in the message content
  messageActivity.text += `[${i + 1}]`;
  messageActivity.addCitation(i + 1, {
    name: doc.title,
    abstract: doc.content,
  });
}
```

<!-- suggested-actions-method -->

You can do that by using the `withSuggestedActions` method on the message.

<!-- suggested-actions-code -->

```typescript
message.withSuggestedActions({
  to: [activity.from.id],
  actions: [
    {
      type: 'imBack',
      title: 'Show pricing options',
      value: 'Show the pricing options available to me',
    },
  ],
});
```

<!-- suggested-actions-submit-send-method -->

Use the `Action.Submit` suggested action type when you want the click to deliver a structured payload to your bot without posting a visible message on the user's behalf.

:::warning Experimental API
The `Action.Submit` card action type and the `suggested-action.submit` route are marked `@experimental`. The platform feature will be generally available by end of summer 2026.
:::

<!-- suggested-actions-submit-send-code -->

```typescript
import { MessageActivity, SuggestedActions } from '@microsoft/teams.api';

const reply = new MessageActivity('Approve or reject the request:');
reply.suggestedActions = {
  to: [],
  actions: [
    { type: 'Action.Submit', title: 'Approve', value: { vote: 'approve' } },
    { type: 'Action.Submit', title: 'Reject', value: { vote: 'reject' } },
  ],
} satisfies SuggestedActions;

await send(reply);
```

<!-- suggested-actions-submit-handle-method -->

The click arrives as a typed `suggestedActions/submit` invoke. Register a handler with the `suggested-action.submit` route and read the payload from `activity.value`.

<!-- suggested-actions-submit-handle-code -->

```typescript
app.on('suggested-action.submit', async ({ send, activity }) => {
  const payload = activity.value != null ? JSON.stringify(activity.value) : '<none>';
  await send(`Got vote: ${payload}`);
});
```
