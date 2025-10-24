<!-- simple-chat-setup -->

Import the relevant namespaces:

```csharp
// AI
using Microsoft.Teams.AI.Models.OpenAI;
using Microsoft.Teams.AI.Prompts;
// Teams
using Microsoft.Teams.Api.Activities;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Annotations;
```

Create a ChatModel, ChatPrompt, and handle user - LLM interactions:

<!-- simple-chat-code -->

```csharp
using Microsoft.Teams.AI.Models.OpenAI;
using Microsoft.Teams.AI.Prompts;
using Microsoft.Teams.AI.Templates;
using Microsoft.Teams.Api.Activities;
using Microsoft.Teams.Apps.Activities;
using Azure.AI.OpenAI;
using System.ClientModel;

// Configuration
var azureOpenAIModel = configuration["AzureOpenAIModel"]!;
var azureOpenAIEndpoint = configuration["AzureOpenAIEndpoint"]!;
var azureOpenAIKey = configuration["AzureOpenAIKey"]!;

var azureOpenAI = new AzureOpenAIClient(
    new Uri(azureOpenAIEndpoint),
    new ApiKeyCredential(azureOpenAIKey)
);

// AI Model
var aiModel = new OpenAIChatModel(azureOpenAIModel, azureOpenAI);

// Simple chat handler
teamsApp.OnMessage(async (context) =>
{
    var prompt = new OpenAIChatPrompt(aiModel, new ChatPromptOptions
    {
        Instructions = new StringTemplate("You are a friendly assistant who talks like a pirate")
    });

    var result = await prompt.Send(context.Activity.Text);
    if (result.Content != null)
    {
        var messageActivity = new MessageActivity
        {
            Text = result.Content,
        }.AddAIGenerated();
        await context.Send(messageActivity);
        // Ahoy, matey! 🏴‍☠️ How be ye doin' this fine day on th' high seas? What can this ol' salty sea dog help ye with? 🚢☠️
    }
});
```

<!-- declarative-approach -->

### Declarative Approach

This approach uses attributes to declare prompts, providing clean separation of concerns.

**Create a Prompt Class:**

```csharp
using Microsoft.Teams.AI.Annotations;

namespace Samples.AI.Prompts;

[Prompt]
[Prompt.Description("A friendly pirate assistant")]
[Prompt.Instructions("You are a friendly assistant who talks like a pirate")]
public class PiratePrompt
{
}
```

**Usage in Program.cs:**

```csharp
using Microsoft.Teams.AI.Models.OpenAI;
using Microsoft.Teams.Api.Activities;

// Create the AI model
var aiModel = new OpenAIChatModel(azureOpenAIModel, azureOpenAI);

// Use the prompt with OpenAIChatPrompt.From()
teamsApp.OnMessage(async (context) =>
{
    var prompt = OpenAIChatPrompt.From(aiModel, new Samples.AI.Prompts.PiratePrompt());

    var result = await prompt.Send(context.Activity.Text);

    if (!string.IsNullOrEmpty(result.Content))
    {
        await context.Send(new MessageActivity { Text = result.Content }.AddAIGenerated());
        // Ahoy, matey! 🏴‍☠️ How be ye doin' this fine day on th' high seas?
    }
});
```

<!-- simple-chat-notes -->

:::note
The current `OpenAIChatModel` implementation uses chat-completions API. The responses API is coming soon.
:::

<!-- additional-concepts -->

N/A

<!-- streaming-code -->

```csharp
// Streaming handler
teamsApp.OnMessage(async (context) =>
{
    var match = Regex.Match(context.Activity.Text ?? "", @"^stream\s+(.+)", RegexOptions.IgnoreCase);
    if (match.Success)
    {
        var query = match.Groups[1].Value.Trim();
        var prompt = new OpenAIChatPrompt(aiModel, new ChatPromptOptions
        {
            Instructions = new StringTemplate("You are a friendly assistant who responds in extremely verbose language")
        });

        var result = await prompt.Send(query, (chunk) =>
        {
            context.Stream.Emit(chunk);
            return Task.CompletedTask;
        });
    }
});
```
