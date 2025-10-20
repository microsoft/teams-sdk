---
sidebar_position: 7
summary: How to implement user feedback collection in Teams AI applications using specialized UI components and feedback storage.
---

# Feedback

User feedback is essential for the improvement of any application. Teams provides specialized UI components to help facilitate the gathering of feedback from users.

![Feedback Message](/screenshots/feedback.gif)

## Storage

Once you receive a feedback event, you can choose to store it in some persistent storage. In the example below, we are storing it in an in-memory store.

```typescript
import { ChatPrompt, IChatModel } from '@microsoft/teams.ai';
import { ActivityLike, IMessageActivity, MessageActivity } from '@microsoft/teams.api';
// ...

// This store would ideally be persisted in a database
export const storedFeedbackByMessageId = new Map<
  string,
  {
    incomingMessage: string;
    outgoingMessage: string;
    likes: number;
    dislikes: number;
    feedbacks: string[];
  }
>();
```

## Including Feedback Buttons

When sending a message that you want feedback in, simply `addFeedback()` to the message you are sending.

```typescript
import { ChatPrompt, IChatModel } from '@microsoft/teams.ai';
import { ActivityLike, IMessageActivity, MessageActivity, SentActivity } from '@microsoft/teams.api';
// ...

const { id: sentMessageId } = await send(
  result.content != null
    ? new MessageActivity(result.content)
        .addAiGenerated()
        /** Add feedback buttons via this method */
        .addFeedback()
    : 'I did not generate a response.'
);

storedFeedbackByMessageId.set(sentMessageId, {
  incomingMessage: activity.text,
  outgoingMessage: result.content ?? '',
  likes: 0,
  dislikes: 0,
  feedbacks: [],
});
```

## Handling the feedback

Once the user decides to like/dislike the message, you can handle the feedback in a received event. Once received, you can choose to include it in your persistent store.

```typescript
import { App } from '@microsoft/teams.apps';
// ...

app.on('message.submit.feedback', async ({ activity, log }) => {
  const { reaction, feedback: feedbackJson } = activity.value.actionValue;
  if (activity.replyToId == null) {
    log.warn(`No replyToId found for messageId ${activity.id}`);
    return;
  }
  const existingFeedback = storedFeedbackByMessageId.get(activity.replyToId);
  /**
   * feedbackJson looks like:
   * {"feedbackText":"Nice!"}
   */
  if (!existingFeedback) {
    log.warn(`No feedback found for messageId ${activity.id}`);
  } else {
    storedFeedbackByMessageId.set(activity.id, {
      ...existingFeedback,
      likes: existingFeedback.likes + (reaction === 'like' ? 1 : 0),
      dislikes: existingFeedback.dislikes + (reaction === 'dislike' ? 1 : 0),
      feedbacks: [...existingFeedback.feedbacks, feedbackJson],
    });
  }
});
```