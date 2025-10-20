---
sidebar_position: 1
summary: Guide to creating and handling dialogs in Teams applications, covering dialog opening mechanisms, content rendering using Adaptive Cards or webpages, and security considerations for web content integration.
---


# Creating Dialogs

:::tip
If you're not familiar with how to build Adaptive Cards, check out [the cards guide](../adaptive-cards). Understanding their basics is a prerequisite for this guide.
:::

## Entry Point

To open a dialog, you need to supply a special type of action to the Adaptive Card. The `TaskFetchAction` is specifically designed for this purpose - it automatically sets up the proper Teams data structure to trigger a dialog. Once this button is clicked, the dialog will open and ask the application what to show.

```csharp
using Microsoft.Teams.Api.Activities;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Annotations;
using Microsoft.Teams.Cards;
using Microsoft.Teams.Common.Logging;

//...

[Message]
public async Task OnMessage([Context] MessageActivity activity, [Context] IContext.Client client, [Context] ILogger log)
{
    // Create the launcher adaptive card
    var card = CreateDialogLauncherCard();
    await client.Send(card);
}

private static AdaptiveCard CreateDialogLauncherCard()
{
    var card = new AdaptiveCard
    {
        Body = new List<CardElement>
        {
            new TextBlock("Select the examples you want to see!")
            {
                Size = TextSize.Large,
                Weight = TextWeight.Bolder
            }
        },
        Actions = new List<Action>
        {
            new TaskFetchAction(new { opendialogtype = "simple_form" })
            {
                Title = "Simple form test"
            },
            new TaskFetchAction(new { opendialogtype = "webpage_dialog" })
            {
                Title = "Webpage Dialog"
            },
            new TaskFetchAction(new { opendialogtype = "multi_step_form" })
            {
                Title = "Multi-step Form"
            }
        }
    };

    return card;
}
```

## Handling Dialog Open Events

Once an action is executed to open a dialog, the Teams client will send an event to the agent to request what the content of the dialog should be. When using `TaskFetchAction`, the data is nested inside an `MsTeams` property structure.

```csharp
using System.Text.Json;
using Microsoft.Teams.Api.TaskModules;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities.Invokes;
using Microsoft.Teams.Apps.Annotations;
using Microsoft.Teams.Common.Logging;

//...

[TaskFetch]
public Microsoft.Teams.Api.TaskModules.Response OnTaskFetch([Context] Tasks.FetchActivity activity, [Context] IContext.Client client, [Context] ILogger log)
{
    var data = activity.Value?.Data as JsonElement?;
    if (data == null)
    {
        log.Info("[TASK_FETCH] No data found in the activity value");
        return new Microsoft.Teams.Api.TaskModules.Response(
            new Microsoft.Teams.Api.TaskModules.MessageTask("No data found in the activity value"));
    }

    var dialogType = data.Value.TryGetProperty("opendialogtype", out var dialogTypeElement) && dialogTypeElement.ValueKind == JsonValueKind.String
        ? dialogTypeElement.GetString()
        : null;

    log.Info($"[TASK_FETCH] Dialog type: {dialogType}");

    return dialogType switch
    {
        "simple_form" => CreateSimpleFormDialog(),
        "webpage_dialog" => CreateWebpageDialog(_configuration, log),
        "multi_step_form" => CreateMultiStepFormDialog(),
        "mixed_example" => CreateMixedExampleDialog(),
        _ => new Microsoft.Teams.Api.TaskModules.Response(
            new Microsoft.Teams.Api.TaskModules.MessageTask("Unknown dialog type"))
    };
}
```

### Rendering A Card

You can render an Adaptive Card in a dialog by returning a card response.

```csharp
using System.Text.Json;
using Microsoft.Teams.Api;
using Microsoft.Teams.Api.TaskModules;
using Microsoft.Teams.Cards;

//...

private static Microsoft.Teams.Api.TaskModules.Response CreateSimpleFormDialog()
{
    var choices = new List<Choice>
    {
        new Choice { Title = "Option 1", Value = "opt1" },
        new Choice { Title = "Option 2", Value = "opt2" },
        new Choice { Title = "Option 3", Value = "opt3" }
    };

    var dialogCard = new AdaptiveCard
    {
        Body = new List<CardElement>
        {
            new TextBlock("This is a simple form")
            {
                Size = TextSize.Large,
                Weight = TextWeight.Bolder
            },
            new TextInput
            {
                Id = "name",
                Label = "Name",
                Placeholder = "Enter your name",
                IsRequired = true
            },
            new ChoiceSetInput
            {
                Id = "preference",
                Label = "Select your preference",
                Choices = choices,
                Style = StyleEnum.Compact
            }
        },
        Actions = new List<Action>
        {
            new SubmitAction
            {
                Title = "Submit",
                Data = new { submissiondialogtype = "simple_form" }
            }
        }
    };

    var taskInfo = new TaskInfo
    {
        Title = "Simple Form Dialog",
        Card = new Attachment
        {
            ContentType = new ContentType("application/vnd.microsoft.card.adaptive"),
            Content = dialogCard
        }
    };

    return new Microsoft.Teams.Api.TaskModules.Response(
        new Microsoft.Teams.Api.TaskModules.ContinueTask(taskInfo));
}
```

:::info
The action type for submitting a dialog must be `Action.Submit`. This is a requirement of the Teams client. If you use a different action type, the dialog will not be submitted and the agent will not receive the submission event.
:::

### Rendering A Webpage

You can render a webpage in a dialog as well. There are some security requirements to be aware of:

1. The webpage must be hosted on a domain that is allow-listed as `validDomains` in the Teams app [manifest](/teams/deployment/manifest) for the agent
2. The webpage must also host the [teams-js client library](https://www.npmjs.com/package/@microsoft/teams-js). The reason for this is that for security purposes, the Teams client will not render arbitrary webpages. As such, the webpage must explicitly opt-in to being rendered in the Teams client. Setting up the teams-js client library handles this for you.

```csharp
using Microsoft.Teams.Api.TaskModules;
using Microsoft.Teams.Common;

//...

private static Microsoft.Teams.Api.TaskModules.Response CreateWebpageDialog(IConfiguration configuration, ILogger log)
{
    var botEndpoint = configuration["BotEndpoint"];
    if (string.IsNullOrEmpty(botEndpoint))
    {
        log.Warn("No remote endpoint detected. Using webpages for dialog will not work as expected");
        botEndpoint = "http://localhost:3978"; // Fallback for local development
    }
    else
    {
        log.Info($"Using BotEndpoint: {botEndpoint}/tabs/dialog-form");
    }

    var taskInfo = new TaskInfo
    {
        Title = "Webpage Dialog",
        Width = new Union<int, Size>(1000),
        Height = new Union<int, Size>(800),
        // Here we are using a webpage that is hosted in the same
        // server as the agent. This server needs to be publicly accessible,
        // needs to set up teams.js client library (https://www.npmjs.com/package/@microsoft/teams-js)
        // and needs to be registered in the manifest.
        Url = $"{botEndpoint}/tabs/dialog-form"
    };

    return new Microsoft.Teams.Api.TaskModules.Response(
        new Microsoft.Teams.Api.TaskModules.ContinueTask(taskInfo));
}
```

### Setting up Embedded Web Content

To serve web content for dialogs, you can use the `AddTab` functionality to embed HTML files as resources:

```csharp
// In Program.cs when building your app 
app.UseTeams();
app.AddTab("dialog-form", "Web/dialog-form");

// Configure project file to embed web resources
// In .csproj:
// <GenerateEmbeddedFilesManifest>true</GenerateEmbeddedFilesManifest>
// <EmbeddedResource Include="Web/**" />
// <Content Remove="Web/**" />
```
