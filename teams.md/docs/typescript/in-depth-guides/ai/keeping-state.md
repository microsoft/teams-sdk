---
sidebar_position: 4
summary: Guide to managing conversation state and history in AI applications, including persistent storage options for conversation context.
---

# Keeping State

By default, LLMs are not stateful. This means that they do not remember previous messages or context when generating a response.
It's common practice to keep state of the conversation history in your application and pass it to the LLM each time you make a request.

By default, the `ChatPrompt` instance will create a temporary in-memory store to keep track of the conversation history. This is beneficial
when you want to use it to generate an LLM response, but not persist the conversation history. But in other cases, you may want to keep the conversation history

:::warning
By reusing the same `ChatPrompt` class instance across multiple conversations will lead to the conversation history being shared across all conversations. Which is usually not the desired behavior.
:::

To avoid this, you need to get messages from your persistent (or in-memory) store and pass it in to the `ChatPrompt`.

:::note
The `ChatPrompt` class will modify the messages object that's passed into it. So if you want to manually manage it, you need to make a copy of the messages object before passing it in.
:::

```typescript
import { ChatPrompt, IChatModel, Message } from '@microsoft/teams.ai';
import { ActivityLike, IMessageActivity, MessageActivity } from '@microsoft/teams.api';
// ...

// Simple in-memory store for conversation histories
// In your application, it may be a good idea to use a more
// persistent store backed by a database or other storage solution
const conversationStore = new Map<string, Message[]>();

const getOrCreateConversationHistory = (conversationId: string) => {
  // Check if conversation history exists
  const existingMessages = conversationStore.get(conversationId);
  if (existingMessages) {
    return existingMessages;
  }
  // If not, create a new conversation history
  const newMessages: Message[] = [];
  conversationStore.set(conversationId, newMessages);
  return newMessages;
};
```

```typescript
import { ChatPrompt, IChatModel, Message } from '@microsoft/teams.ai';
import { ActivityLike, IMessageActivity, MessageActivity } from '@microsoft/teams.api';
// ...

/**
 * Example of a stateful conversation handler that maintains conversation history
 * using an in-memory store keyed by conversation ID.
 * @param model The chat model to use
 * @param activity The incoming activity
 * @param send Function to send an activity
 */
export const handleStatefulConversation = async (
  model: IChatModel,
  activity: IMessageActivity,
  send: (activity: ActivityLike) => Promise<any>,
  log: ILogger
) => {
  log.info('Received message', activity.text);

  // Retrieve existing conversation history or initialize new one
  const existingMessages = getOrCreateConversationHistory(activity.conversation.id);

  log.info('Existing messages before sending to prompt', existingMessages);

  // Create prompt with existing messages
  const prompt = new ChatPrompt({
    instructions: 'You are a helpful assistant.',
    model,
    messages: existingMessages, // Pass in existing conversation history
  });

  const result = await prompt.send(activity.text);

  if (result) {
    await send(
      result.content != null
        ? new MessageActivity(result.content).addAiGenerated()
        : 'I did not generate a response.'
    );
  }

  log.info('Messages after sending to prompt:', existingMessages);
};
```

![Stateful Chat Example](/screenshots/stateful-chat-example.png)
