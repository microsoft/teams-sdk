<!-- single-action-example -->

```csharp
using Microsoft.Teams.Cards;

var action = new ExecuteAction
{
    Title = "Submit Feedback",
    Data = new Union<string, SubmitActionData>(new SubmitActionData
    {
        NonSchemaProperties = new Dictionary<string, object?>
        {
            { "action", "submit_feedback" }
        }
    }),
    AssociatedInputs = AssociatedInputs.Auto
};
```

<!-- action-set-example -->

```csharp
using Microsoft.Teams.Cards;

var card = new AdaptiveCard
{
    Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
    Actions = new List<Microsoft.Teams.Cards.Action>
    {
        new ExecuteAction
        {
            Title = "Submit Feedback",
            Data = new Union<string, SubmitActionData>(new SubmitActionData
            {
                NonSchemaProperties = new Dictionary<string, object?>
                {
                    { "action", "submit_feedback" }
                }
            })
        },
        new OpenUrlAction("https://adaptivecards.microsoft.com")
        {
            Title = "Learn More"
        }
    }
};
```

<!-- json-safety-note -->

N/A

<!-- raw-json-example -->

```csharp
var actionJson = """
{
  "type": "Action.OpenUrl",
  "url": "https://adaptivecards.microsoft.com",
  "title": "Learn More"
}
""";
var action = OpenUrlAction.Deserialize(actionJson);
```

<!-- input-association-example -->

```csharp
private static AdaptiveCard CreateProfileCard()
{
    return new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new TextBlock("User Profile")
            {
                Weight = TextWeight.Bolder,
                Size = TextSize.Large
            },
            new TextInput
            {
                Id = "name",
                Label = "Name",
                Value = "John Doe"
            },
            new TextInput
            {
                Id = "email",
                Label = "Email",
                Value = "john@contoso.com"
            },
            new ToggleInput("Subscribe to newsletter")
            {
                Id = "subscribe",
                Value = "false"
            }
        },
        Actions = new List<Microsoft.Teams.Cards.Action>
        {
            new ExecuteAction
            {
                Title = "Save",
                // entity_id will come back after the user submits
                Data = new Union<string, SubmitActionData>(new SubmitActionData
                {
                    NonSchemaProperties = new Dictionary<string, object?>
                    {
                        { "action", "save_profile" },
                        { "entity_id", "12345" }
                    }
                }),
                AssociatedInputs = AssociatedInputs.Auto
            }
        }
    };
}

// Data received in handler (conceptual structure)
/*
{
  "action": "save_profile",
  "entity_id": "12345",     // From action data
  "name": "John Doe",       // From name input
  "email": "john@doe.com",  // From email input
  "subscribe": "true"       // From toggle input (as string)
}

Accessed in C# as:
- data["action"] → "save_profile"
- data["entity_id"] → "12345"
- data["name"] → "John Doe"
- data["email"] → "john@doe.com"
- data["subscribe"] → "true"
*/
```

<!-- input-validation-example -->

```csharp
private static AdaptiveCard CreateProfileCardWithValidation()
{
    return new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new TextBlock("Profile with Validation")
            {
                Weight = TextWeight.Bolder,
                Size = TextSize.Large
            },
            new NumberInput
            {
                Id = "age",
                Label = "Age",
                IsRequired = true,
                Min = 0,
                Max = 120
            },
            // Can configure custom error messages
            new TextInput
            {
                Id = "name",
                Label = "Name",
                IsRequired = true,
                ErrorMessage = "Name is required"
            },
            new TextInput
            {
                Id = "location",
                Label = "Location"
            }
        },
        Actions = new List<Microsoft.Teams.Cards.Action>
        {
            new ExecuteAction
            {
                Title = "Save",
                // All inputs should be validated
                Data = new Union<string, SubmitActionData>(new SubmitActionData
                {
                    NonSchemaProperties = new Dictionary<string, object?>
                    {
                        { "action", "save_profile" }
                    }
                }),
                AssociatedInputs = AssociatedInputs.Auto
            }
        }
    };
}
```

<!-- handlers-section -->

## Server Handlers

### Basic Structure

Card actions arrive as `card.action` activities in your app. These give you access to the validated input values plus any `data` values you had configured to be sent back to you.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">
    ```csharp
    using System.Text.Json;
    using Microsoft.Teams.Api.AdaptiveCards;
    using Microsoft.Teams.Apps.Annotations;

    [TeamsController]
    public class AdaptiveCardController
    {
        [AdaptiveCard.Action]
        public async Task<ActionResponse> OnAction([Context] IContext context, CancellationToken cancellationToken)
        {
            var data = context.Activity.Value?.Action?.Data;

            if (data == null)
                return new ActionResponse.Message("No data specified") { StatusCode = 400 };

            string? action = data.TryGetValue("action", out var actionObj) ? actionObj?.ToString() : null;

            if (string.IsNullOrEmpty(action))
                return new ActionResponse.Message("No action specified") { StatusCode = 400 };

            string? GetFormValue(string key)
            {
                if (data.TryGetValue(key, out var val))
                {
                    if (val is JsonElement element)
                        return element.GetString();
                    return val?.ToString();
                }
                return null;
            }

            switch (action)
            {
                case "submit_basic":
                    var notifyValue = GetFormValue("notify") ?? "false";
                    await context.Client.Send($"Basic card submitted! Notify setting: {notifyValue}");
                    break;

                case "submit_feedback":
                    var feedbackText = GetFormValue("feedback") ?? "No feedback provided";
                    await context.Client.Send($"Feedback received: {feedbackText}");
                    break;

                case "create_task":
                    var title = GetFormValue("title") ?? "Untitled";
                    var priority = GetFormValue("priority") ?? "medium";
                    var dueDate = GetFormValue("due_date") ?? "No date";
                    await context.Client.Send($"Task created!\nTitle: {title}\nPriority: {priority}\nDue: {dueDate}");
                    break;

                case "save_profile":
                    var name = GetFormValue("name") ?? "Unknown";
                    var email = GetFormValue("email") ?? "No email";
                    var subscribe = GetFormValue("subscribe") ?? "false";
                    var age = GetFormValue("age");
                    var location = GetFormValue("location") ?? "Not specified";

                    var response = $"Profile saved!\nName: {name}\nEmail: {email}\nSubscribed: {subscribe}";
                    if (!string.IsNullOrEmpty(age))
                        response += $"\nAge: {age}";
                    if (location != "Not specified")
                        response += $"\nLocation: {location}";

                    await context.Client.Send(response);
                    break;

                case "test_json":
                    await context.Client.Send("JSON deserialization test successful!");
                    break;

                default:
                    return new ActionResponse.Message("Unknown action") { StatusCode = 400 };
            }

            return new ActionResponse.Message("Action processed successfully");
        }
    }
    ```
  </TabItem>
  <TabItem value="core" label="SDK 2.1 (Preview)">
    ```csharp
    using System.Text.Json;
    using Microsoft.Teams.Apps;

    bot.OnAdaptiveCardAction(async (context, cancellationToken) =>
    {
        var data = context.Activity.Value?.Action?.Data;

        if (data == null)
            return AdaptiveCardResponse.CreateMessageResponse("No data specified", 400);

        string? action = data.TryGetValue("action", out var actionObj) ? actionObj?.ToString() : null;

        if (string.IsNullOrEmpty(action))
            return AdaptiveCardResponse.CreateMessageResponse("No action specified", 400);

        string? GetFormValue(string key)
        {
            if (data.TryGetValue(key, out var val))
            {
                if (val is JsonElement element)
                    return element.GetString();
                return val?.ToString();
            }
            return null;
        }

        switch (action)
        {
            case "submit_basic":
                var notifyValue = GetFormValue("notify") ?? "false";
                await context.SendAsync($"Basic card submitted! Notify setting: {notifyValue}", cancellationToken);
                break;

            case "submit_feedback":
                var feedbackText = GetFormValue("feedback") ?? "No feedback provided";
                await context.SendAsync($"Feedback received: {feedbackText}", cancellationToken);
                break;

            case "create_task":
                var title = GetFormValue("title") ?? "Untitled";
                var priority = GetFormValue("priority") ?? "medium";
                var dueDate = GetFormValue("due_date") ?? "No date";
                await context.SendAsync($"Task created!\nTitle: {title}\nPriority: {priority}\nDue: {dueDate}", cancellationToken);
                break;

            case "save_profile":
                var name = GetFormValue("name") ?? "Unknown";
                var email = GetFormValue("email") ?? "No email";
                var subscribe = GetFormValue("subscribe") ?? "false";
                var age = GetFormValue("age");
                var location = GetFormValue("location") ?? "Not specified";

                var response = $"Profile saved!\nName: {name}\nEmail: {email}\nSubscribed: {subscribe}";
                if (!string.IsNullOrEmpty(age))
                    response += $"\nAge: {age}";
                if (location != "Not specified")
                    response += $"\nLocation: {location}";

                await context.SendAsync(response, cancellationToken);
                break;

            case "test_json":
                await context.SendAsync("JSON deserialization test successful!", cancellationToken);
                break;

            default:
                return AdaptiveCardResponse.CreateMessageResponse("Unknown action", 400);
        }

        return AdaptiveCardResponse.CreateMessageResponse("Action processed successfully");
    });
    ```
  </TabItem>
</Tabs>

:::note
The `data` values come from JSON and need to be extracted using the helper method shown above to handle different JSON element types.
:::

<!-- dynamic-search-card -->

```csharp
using Microsoft.Teams.Cards;

private static AdaptiveCard CreateDynamicSearchCard()
{
    return new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new ChoiceSetInput
            {
                Id = "game",
                Label = "Game",
                Placeholder = "Search for a game",
                Style = ChoiceSetInputStyle.Filtered,
                Choices = new List<Choice>()
            }.WithChoicesData(new QueryData { Dataset = "nintendoGames" })
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
                        { "action", "submit_game" }
                    }
                })
            }
        }
    };
}
```

<!-- dynamic-search-handler -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">
    :::note
    Dynamic typeahead search for Adaptive Cards is not supported in SDK 2.0. Use SDK 2.1 (Preview) for this feature.
    :::
  </TabItem>
  <TabItem value="core" label="SDK 2.1 (Preview)">
    ```csharp
    using Microsoft.Teams.Apps;
    using Microsoft.Teams.Apps.Handlers;

    var games = new[] { "Super Mario Odyssey", "Metroid Dread", "Splatoon 3" };

    bot.OnSearch((context, cancellationToken) =>
    {
        var query = context.Activity.Value?.QueryText?.ToLowerInvariant() ?? "";
        var results = games
            .Where(g => g.ToLowerInvariant().Contains(query))
            .Select(g => new SearchResult { Title = g, Value = g })
            .ToList();

        var response = new SearchResponse
        {
            Value = new SearchResponseValue { Results = results }
        };

        return Task.FromResult(new InvokeResponse<SearchResponse>(200, response));
    });
    ```
  </TabItem>
</Tabs>

