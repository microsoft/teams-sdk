---
sidebar_position: 4
summary: Guide to managing conversation state in LLM interactions, explaining how to maintain chat history using ChatPrompt's state management capabilities and implementing custom persistence strategies for multi-conversation scenarios.
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

## State Initialization

Here's how to initialize and manage conversation state for multiple conversations:

```python
from microsoft.teams.ai import ChatPrompt, ListMemory, AIModel
from microsoft.teams.openai import OpenAICompletionsAIModel

# Simple in-memory store for conversation histories
# In your application, it may be a good idea to use a more
# persistent store backed by a database or other storage solution
conversation_store: dict[str, ListMemory] = {}

# Initialize AI model
ai_model = OpenAICompletionsAIModel(model="gpt-4")

def get_or_create_conversation_memory(conversation_id: str) -> ListMemory:
    """Get or create conversation memory for a specific conversation"""
    if conversation_id not in conversation_store:
        conversation_store[conversation_id] = ListMemory()
    return conversation_store[conversation_id]

async def clear_conversation_memory(conversation_id: str) -> None:
    """Clear memory for a specific conversation"""
    if conversation_id in conversation_store:
        memory = conversation_store[conversation_id]
        await memory.set_all([])
        print(f"Cleared memory for conversation {conversation_id}")
```

## Stateful Chat Example

```python
from microsoft.teams.ai import ChatPrompt, ListMemory, AIModel
from microsoft.teams.api import MessageActivity, MessageActivityInput
from microsoft.teams.apps import ActivityContext
# ...

async def handle_stateful_conversation(model: AIModel, ctx: ActivityContext[MessageActivity]) -> None:
    """Example of stateful conversation handler that maintains conversation history"""
    print(f"Received message: {ctx.activity.text}")

    # Retrieve existing conversation memory or initialize new one
    memory = get_or_create_conversation_memory(ctx.activity.conversation.id)

    # Get existing messages for logging
    existing_messages = await memory.get_all()
    print(f"Existing messages before sending to prompt: {len(existing_messages)} messages")

    # Create ChatPrompt with conversation-specific memory
    chat_prompt = ChatPrompt(model, memory=memory)

    chat_result = await chat_prompt.send(
        input=ctx.activity.text, 
        instructions="You are a helpful assistant that remembers our previous conversation."
    )

    if chat_result.response.content:
        message = MessageActivityInput(text=chat_result.response.content).add_ai_generated()
        await ctx.send(message)
    else:
        await ctx.reply("I did not generate a response.")

    # Log final message count
    final_messages = await memory.get_all()
    print(f"Messages after sending to prompt: {len(final_messages)} messages")

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    """Handle messages using stateful conversation"""
    await handle_stateful_conversation(ai_model, ctx)
```

![Screenshot of chat between user and agent, user first states 'My dinosaur's name is Barnie' and later asks What's my pet's name and the agent responds correctly with 'Barnie'.](/screenshots/stateful-chat-example.png)
