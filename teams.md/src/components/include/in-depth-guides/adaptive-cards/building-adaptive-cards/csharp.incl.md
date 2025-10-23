<!-- package-name -->

`Microsoft.Teams.Cards`

<!-- intro-description -->

With `Microsoft.Teams.Cards` you can build these cards entirely in C# while enjoying full IntelliSense and compiler safety.

<!-- builder-description -->

`Microsoft.Teams.Cards` exposes small **builder helpers** including `AdaptiveCard`, `TextBlock`, `ToggleInput`, `ExecuteAction`, _etc._

<!-- language-name -->

C#

<!-- builder-example -->

```csharp
using Microsoft.Teams.Cards;

var card = new AdaptiveCard
{
    Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
    Body = new List<CardElement>
    {
        new TextBlock("Hello world")
        {
            Wrap = true,
            Weight = TextWeight.Bolder
        },
        new ToggleInput("Notify me")
        {
            Id = "notify"
        }
    },
    Actions = new List<Microsoft.Teams.Cards.Action>
    {
        new ExecuteAction
        {
            Title = "Submit",
            Data = new Union<string, SubmitActionData>(new SubmitActionData
            {
                NonSchemaProperties = new Dictionary<string, object?>
                {
                    { "action", "submit_basic" }
                }
            }),
            AssociatedInputs = AssociatedInputs.Auto
        }
    }
};
```

<!-- source-code-note -->

:::info
The builder helpers use strongly-typed interfaces. Use IntelliSense (Ctrl+Space) or "Go to Definition" (F12) in your IDE to explore available types and properties. Source code lives in the `Microsoft.Teams.Cards` namespace.
:::

<!-- type-safety-example -->

```csharp
// "Huge" is not a valid size for TextBlock - this will cause a compilation error
var textBlock = new TextBlock("Test")
{
    Wrap = true,
    Weight = TextWeight.Bolder,
    Size = "Huge" // This is invalid - should be TextSize enum
};
```

<!-- additional-type-info -->

<!-- designer-example -->

```csharp
var cardJson = """
{
    "type": "AdaptiveCard",
    "body": [
        {
            "type": "ColumnSet",
            "columns": [
                {
                    "type": "Column",
                    "verticalContentAlignment": "center",
                    "items": [
                        {
                            "type": "Image",
                            "style": "Person",
                            "url": "https://aka.ms/AAp9xo4",
                            "size": "Small",
                            "altText": "Portrait of David Claux"
                        }
                    ],
                    "width": "auto"
                },
                {
                    "type": "Column",
                    "spacing": "medium",
                    "verticalContentAlignment": "center",
                    "items": [
                        {
                            "type": "TextBlock",
                            "weight": "Bolder",
                            "text": "David Claux",
                            "wrap": true
                        }
                    ],
                    "width": "auto"
                },
                {
                    "type": "Column",
                    "spacing": "medium",
                    "verticalContentAlignment": "center",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Principal Platform Architect at Microsoft",
                            "isSubtle": true,
                            "wrap": true
                        }
                    ],
                    "width": "stretch"
                }
            ]
        }
    ],
    "version": "1.5",
    "schema": "http://adaptivecards.io/schemas/adaptive-card.json"
}
""";

// Deserialize the JSON into an AdaptiveCard object
var card = AdaptiveCard.Deserialize(cardJson);

// Send the card
await client.Send(card);
```

<!-- card-interface -->

`AdaptiveCard`

<!-- example-intro -->

<Tabs>
  <TabItem label="Controller" value="controller" default>
    ```csharp
    [Message]
    public async Task OnMessage([Context] MessageActivity activity, [Context] IContext.Client client)
    {
        var text = activity.Text?.ToLowerInvariant() ?? "";

        if (text.Contains("form"))
        {
            await client.Typing();
            var card = CreateTaskFormCard();
            await client.Send(card);
        }
    }
    ```

  </TabItem>
  <TabItem label="Minimal" value="minimal">
    ```csharp
    teams.OnMessage(async context =>
    {
        var text = context.Activity.Text?.ToLowerInvariant() ?? "";

        if (text.Contains("form"))
        {
            await context.Typing();
            var card = CreateTaskFormCard();
            await context.Send(card);
        }
    });
    ```

  </TabItem>
</Tabs>

The definition for `CreateTaskFormCard` is as follows

<!-- task-form-example -->

```csharp
private static AdaptiveCard CreateTaskFormCard()
{
    return new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new TextBlock("Create New Task")
            {
                Weight = TextWeight.Bolder,
                Size = TextSize.Large
            },
            new TextInput
            {
                Id = "title",
                Label = "Task Title",
                Placeholder = "Enter task title"
            },
            new TextInput
            {
                Id = "description",
                Label = "Description",
                Placeholder = "Enter task details",
                IsMultiline = true
            },
            new ChoiceSetInput
            {
                Id = "priority",
                Label = "Priority",
                Value = "medium",
                Choices = new List<Choice>
                {
                    new() { Title = "High", Value = "high" },
                    new() { Title = "Medium", Value = "medium" },
                    new() { Title = "Low", Value = "low" }
                }
            },
            new DateInput
            {
                Id = "due_date",
                Label = "Due Date",
                Value = DateTime.Now.ToString("yyyy-MM-dd")
            }
        },
        Actions = new List<Microsoft.Teams.Cards.Action>
        {
            new ExecuteAction
            {
                Title = "Create Task",
                Data = new Union<string, SubmitActionData>(new SubmitActionData
                {
                    NonSchemaProperties = new Dictionary<string, object?>
                    {
                        { "action", "create_task" }
                    }
                }),
                AssociatedInputs = AssociatedInputs.Auto,
                Style = ActionStyle.Positive
            }
        }
    };
}
```
