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
