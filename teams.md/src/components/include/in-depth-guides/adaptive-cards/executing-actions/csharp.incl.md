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

<!-- server-handler-example -->

```csharp
using System.Text.Json;
using Microsoft.Teams.Api.Activities.Invokes.AdaptiveCards;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Annotations;
using Microsoft.Teams.Common.Logging;

//...

teams.OnAdaptiveCardAction(async context =>
{
    var activity = context.Activity;
    context.Log.Info("[CARD_ACTION] Card action received");

    var data = activity.Value?.Action?.Data;

    context.Log.Info($"[CARD_ACTION] Raw data: {JsonSerializer.Serialize(data)}");

    if (data == null)
    {
        context.Log.Error("[CARD_ACTION] No data in card action");
        return new ActionResponse.Message("No data specified") { StatusCode = 400 };
    }

    string? action = data.TryGetValue("action", out var actionObj) ? actionObj?.ToString() : null;

    if (string.IsNullOrEmpty(action))
    {
        context.Log.Error("[CARD_ACTION] No action specified in card data");
        return new ActionResponse.Message("No action specified") { StatusCode = 400 };
    }
    context.Log.Info($"[CARD_ACTION] Processing action: {action}");

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
            await context.Send($"Basic card submitted! Notify setting: {notifyValue}");
            break;

        case "submit_feedback":
            var feedbackText = GetFormValue("feedback") ?? "No feedback provided";
            await context.Send($"Feedback received: {feedbackText}");
            break;

        case "create_task":
            var title = GetFormValue("title") ?? "Untitled";
            var priority = GetFormValue("priority") ?? "medium";
            var dueDate = GetFormValue("due_date") ?? "No date";
            await context.Send($"Task created!\nTitle: {title}\nPriority: {priority}\nDue: {dueDate}");
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

            await context.Send(response);
            break;

        case "test_json":
            await context.Send("JSON deserialization test successful!");
            break;

        default:
            context.Log.Error($"[CARD_ACTION] Unknown action: {action}");
            return new ActionResponse.Message("Unknown action") { StatusCode = 400 };
    }

    return new ActionResponse.Message("Action processed successfully") { StatusCode = 200 };
});
```

<!-- data-typing-note -->

:::note
The `data` values come from JSON and need to be extracted using the helper method shown above to handle different JSON element types.
:::
