---
sidebar_position: 3
summary: Tutorial on implementing multi-step dialogs in Teams, demonstrating how to create dynamic form flows that adapt based on user input, with examples of handling state between steps and conditional navigation.
---

# Handling Multi-Step Forms

Dialogs can become complex yet powerful with multi-step forms. These forms can alter the flow of the survey depending on the user's input or customize subsequent steps based on previous answers.

## Creating the Initial Dialog

Start off by sending an initial card in the `TaskFetch` event.

```csharp
using System.Text.Json;
using Microsoft.Teams.Api;
using Microsoft.Teams.Api.TaskModules;
using Microsoft.Teams.Cards;

//...

private static Response CreateMultiStepFormDialog()
{
    var cardJson = """
    {
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
            {
                "type": "TextBlock",
                "text": "This is a multi-step form",
                "size": "Large",
                "weight": "Bolder"
            },
            {
                "type": "Input.Text",
                "id": "name",
                "label": "Name",
                "placeholder": "Enter your name",
                "isRequired": true
            }
        ],
        "actions": [
            {
                "type": "Action.Submit",
                "title": "Submit",
                "data": {"submissiondialogtype": "webpage_dialog_step_1"}
            }
        ]
    }
    """;

    var dialogCard = JsonSerializer.Deserialize<AdaptiveCard>(cardJson)
        ?? throw new InvalidOperationException("Failed to deserialize multi-step form card");

    var taskInfo = new TaskInfo
    {
        Title = "Multi-step Form Dialog",
        Card = new Attachment
        {
            ContentType = new ContentType("application/vnd.microsoft.card.adaptive"),
            Content = dialogCard
        }
    };

    return new Response(new ContinueTask(taskInfo));
}
```

Then in the submission handler, you can choose to `continue` the dialog with a different card.

```csharp
using System.Text.Json;
using Microsoft.Teams.Api;
using Microsoft.Teams.Api.TaskModules;
using Microsoft.Teams.Cards;

//...

// Add these cases to your OnTaskSubmit method
case "webpage_dialog_step_1":
    var nameStep1 = GetFormValue("name") ?? "Unknown";
    var nextStepCardJson = $$"""
    {
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
            {
                "type": "TextBlock",
                "text": "Email",
                "size": "Large",
                "weight": "Bolder"
            },
            {
                "type": "Input.Text",
                "id": "email",
                "label": "Email",
                "placeholder": "Enter your email",
                "isRequired": true
            }
        ],
        "actions": [
            {
                "type": "Action.Submit",
                "title": "Submit",
                "data": {"submissiondialogtype": "webpage_dialog_step_2", "name": "{{nameStep1}}"}
            }
        ]
    }
    """;

    var nextStepCard = JsonSerializer.Deserialize<AdaptiveCard>(nextStepCardJson)
        ?? throw new InvalidOperationException("Failed to deserialize next step card");

    var nextStepTaskInfo = new TaskInfo
    {
        Title = $"Thanks {nameStep1} - Get Email",
        Card = new Attachment
        {
            ContentType = new ContentType("application/vnd.microsoft.card.adaptive"),
            Content = nextStepCard
        }
    };

    return new Response(new ContinueTask(nextStepTaskInfo));

case "webpage_dialog_step_2":
    var nameStep2 = GetFormValue("name") ?? "Unknown";
    var emailStep2 = GetFormValue("email") ?? "No email";
    await client.Send($"Hi {nameStep2}, thanks for submitting the form! We got that your email is {emailStep2}");
    return new Response(new MessageTask("Multi-step form completed successfully"));
```

### Complete Multi-Step Form Handler

Here's the complete example showing how to handle a multi-step form:

```csharp
using System.Text.Json;
using Microsoft.Teams.Api;
using Microsoft.Teams.Api.TaskModules;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities.Invokes;
using Microsoft.Teams.Apps.Annotations;
using Microsoft.Teams.Cards;
using Microsoft.Teams.Common.Logging;

//...

[TaskSubmit]
public async Task<Response> OnTaskSubmit([Context] Tasks.SubmitActivity activity, [Context] IContext.Client client, [Context] ILogger log)
{
    log.Info("[TASK_SUBMIT] Task submit request received");

    var data = activity.Value?.Data as JsonElement?;
    if (data == null)
    {
        log.Info("[TASK_SUBMIT] No data found in the activity value");
        return new Response(new MessageTask("No data found in the activity value"));
    }

    var submissionType = data.Value.TryGetProperty("submissiondialogtype", out var submissionTypeObj) && submissionTypeObj.ValueKind == JsonValueKind.String
        ? submissionTypeObj.ToString()
        : null;

    log.Info($"[TASK_SUBMIT] Submission type: {submissionType}");

    string? GetFormValue(string key)
    {
        if (data.Value.TryGetProperty(key, out var val))
        {
            if (val is JsonElement element)
                return element.GetString();
            return val.ToString();
        }
        return null;
    }

    switch (submissionType)
    {
        case "webpage_dialog_step_1":
            var nameStep1 = GetFormValue("name") ?? "Unknown";
            var nextStepCardJson = $$"""
            {
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": [
                    {
                        "type": "TextBlock",
                        "text": "Email",
                        "size": "Large",
                        "weight": "Bolder"
                    },
                    {
                        "type": "Input.Text",
                        "id": "email",
                        "label": "Email",
                        "placeholder": "Enter your email",
                        "isRequired": true
                    }
                ],
                "actions": [
                    {
                        "type": "Action.Submit",
                        "title": "Submit",
                        "data": {"submissiondialogtype": "webpage_dialog_step_2", "name": "{{nameStep1}}"}
                    }
                ]
            }
            """;

            var nextStepCard = JsonSerializer.Deserialize<AdaptiveCard>(nextStepCardJson)
                ?? throw new InvalidOperationException("Failed to deserialize next step card");

            var nextStepTaskInfo = new TaskInfo
            {
                Title = $"Thanks {nameStep1} - Get Email",
                Card = new Attachment
                {
                    ContentType = new ContentType("application/vnd.microsoft.card.adaptive"),
                    Content = nextStepCard
                }
            };

            return new Response(new ContinueTask(nextStepTaskInfo));

        case "webpage_dialog_step_2":
            var nameStep2 = GetFormValue("name") ?? "Unknown";
            var emailStep2 = GetFormValue("email") ?? "No email";
            await client.Send($"Hi {nameStep2}, thanks for submitting the form! We got that your email is {emailStep2}");
            return new Response(new MessageTask("Multi-step form completed successfully"));

        default:
            return new Response(new MessageTask("Unknown submission type"));
    }
}
```
