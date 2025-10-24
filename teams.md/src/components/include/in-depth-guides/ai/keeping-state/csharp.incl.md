<!-- state-initialization -->

```csharp
using Microsoft.Teams.AI;
using Microsoft.Teams.AI.Messages;
using Microsoft.Teams.AI.Models.OpenAI;
using Microsoft.Teams.AI.Prompts;
using Microsoft.Teams.AI.Templates;
using Microsoft.Teams.Api.Activities;
using Microsoft.Teams.Apps;

// Simple in-memory store for conversation histories
// In your application, it may be a good idea to use a more
// persistent store backed by a database or other storage solution
private static readonly Dictionary<string, List<IMessage>> ConversationStore = new();

/// <summary>
/// Get or create conversation memory for a specific conversation
/// </summary>
public static List<IMessage> GetOrCreateConversationMemory(string conversationId)
{
    if (!ConversationStore.ContainsKey(conversationId))
    {
        ConversationStore[conversationId] = new List<IMessage>();
    }

    return ConversationStore[conversationId];
}

/// <summary>
/// Clear memory for a specific conversation
/// </summary>
public static Task ClearConversationMemory(string conversationId)
{
    if (ConversationStore.TryGetValue(conversationId, out var messages))
    {
        var messageCount = messages.Count;
        messages.Clear();
    }

    return Task.CompletedTask;
}
```

<!-- usage-example -->

```csharp
/// <summary>
/// Example of stateful conversation handler that maintains conversation history
/// </summary>
public static async Task HandleStatefulConversation(OpenAIChatModel model, IContext<MessageActivity> context)
{
    // Retrieve existing conversation memory or initialize new one
    var messages = GetOrCreateConversationMemory(context.Activity.Conversation.Id);

    // Create prompt with conversation-specific memory
    var prompt = new OpenAIChatPrompt(model, new ChatPromptOptions
    {
        Instructions = new StringTemplate("You are a helpful assistant that remembers our previous conversation.")
    });

    // Send with existing messages as context
    var options = new IChatPrompt<OpenAI.Chat.ChatCompletionOptions>.RequestOptions
    {
        Messages = messages
    };
    var result = await prompt.Send(context.Activity.Text, options);

    if (result.Content != null)
    {
        var message = new MessageActivity
        {
            Text = result.Content,
        }.AddAIGenerated();
        await context.Send(message);

        // Update conversation history
        messages.Add(UserMessage.Text(context.Activity.Text));
        messages.Add(new ModelMessage<string>(result.Content));
    }
    else
    {
        await context.Reply("I did not generate a response.");
    }
}
```

<!-- additional-info -->

### Usage in your application

```csharp
teamsApp.OnMessage(async (context) =>
{
    await HandleStatefulConversation(aiModel, context);
});
```

#### How It Works

1. **Conversation Store**: A dictionary maps conversation IDs to their message histories
2. **Per-Conversation Memory**: Each conversation gets its own isolated message list
3. **Request Options**: Pass the message history via `RequestOptions.Messages` when calling `Send()`
4. **Automatic Updates**: After receiving a response, manually add both the user message and AI response to the store
5. **Persistence**: The conversation history persists across multiple user interactions within the same conversation

:::tip
The `ChatPrompt.Send()` method does **not** automatically update the messages you pass in via `RequestOptions`. You must manually add the user message and AI response to your conversation store after each interaction.
:::

:::note
In a production application, consider using a more robust storage solution like Azure Cosmos DB, SQL Server, or Redis instead of an in-memory dictionary. This ensures conversation history persists across application restarts and scales across multiple instances.
:::

![Stateful Chat Example](/screenshots/stateful-chat-example.png)
