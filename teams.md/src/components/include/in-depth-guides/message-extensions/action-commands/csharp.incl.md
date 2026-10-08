<!-- handle-submission-intro -->

Handle submission when the `createCard` or `getMessageDetails` actions commands are invoked.

<!-- handle-submission-code -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using System.Text.Json;
using Microsoft.Teams.Api.Activities.Invokes.MessageExtensions;
using Microsoft.Teams.Api.MessageExtensions;
using Microsoft.Teams.Apps.Annotations;

//...

[MessageExtension.SubmitAction]
public Response OnMessageExtensionSubmit(
    [Context] SubmitActionActivity activity,
    [Context] IContext.Client client,
    [Context] ILogger log)
{
    log.Info("[MESSAGE_EXT_SUBMIT] Action submit received");

    var commandId = activity.Value?.CommandId;
    var data = activity.Value?.Data as JsonElement?;

    log.Info($"[MESSAGE_EXT_SUBMIT] Command: {commandId}");
    log.Info($"[MESSAGE_EXT_SUBMIT] Data: {JsonSerializer.Serialize(data)}");

    switch (commandId)
    {
        case "createCard":
            return HandleCreateCard(data, log);

        case "getMessageDetails":
            return HandleGetMessageDetails(activity, log);

        default:
            log.Error($"[MESSAGE_EXT_SUBMIT] Unknown command: {commandId}");
            return CreateErrorActionResponse("Unknown command");
    }
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps.MessageExtensions;

//...

bot.OnSubmitAction(async (context, cancellationToken) =>
{
    MessageExtensionAction? action = context.Activity.Value;
    string? commandId = action?.CommandId;
    JsonElement? data = action?.Data as JsonElement?;

    return commandId switch
    {
        "createCard" => HandleCreateCard(data),
        "getMessageDetails" => HandleGetMessageDetails(action),
        _ => MessageExtensionActionResponse.CreateBuilder()
            .WithComposeExtension(MessageExtensionResponse.CreateBuilder()
                .WithType(MessageExtensionResponseTypes.Message)
                .WithText($"Unknown command: {commandId}"))
            .Build()
    };
});
```

</TabItem>
</Tabs>

<!-- create-card-function -->

`HandleCreateCard()` method

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using System.Text.Json;
using Microsoft.Teams.Api.MessageExtensions;
using Microsoft.Teams.Cards;
using Microsoft.Teams.Common;

//...

private static Response HandleCreateCard(JsonElement? data, ILogger log)
{
    var title = GetJsonValue(data, "title") ?? "Default Title";
    var description = GetJsonValue(data, "description") ?? "Default Description";

    log.Info($"[CREATE_CARD] Title: {title}, Description: {description}");

    var card = new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new TextBlock("Custom Card Created")
            {
                Weight = TextWeight.Bolder,
                Size = TextSize.Large,
                Color = TextColor.Good
            },
            new TextBlock(title)
            {
                Weight = TextWeight.Bolder,
                Size = TextSize.Medium
            },
            new TextBlock(description)
            {
                Wrap = true,
                IsSubtle = true
            }
        }
    };

    var attachment = new Microsoft.Teams.Api.MessageExtensions.Attachment
    {
        ContentType = ContentType.AdaptiveCard,
        Content = card
    };

    return new Response
    {
        ComposeExtension = new Result
        {
            Type = ResultType.Result,
            AttachmentLayout = Layout.List,
            Attachments = new List<Microsoft.Teams.Api.MessageExtensions.Attachment> { attachment }
        }
    };
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps.MessageExtensions;
using Microsoft.Teams.Apps.Schema;
using Microsoft.Teams.Cards;

//...

private static InvokeResponse<MessageExtensionActionResponse> HandleCreateCard(JsonElement? data)
{
    var title = GetJsonValue(data, "title") ?? "Default Title";
    var description = GetJsonValue(data, "description") ?? "Default Description";

    var card = new AdaptiveCard
    {
        Body = new List<CardElement>
        {
            new TextBlock("Custom Card Created")
            {
                Weight = TextWeight.Bolder,
                Size = TextSize.Large,
                Color = TextColor.Good
            },
            new TextBlock(title) { Weight = TextWeight.Bolder, Size = TextSize.Medium },
            new TextBlock(description) { Wrap = true, IsSubtle = true }
        }
    };

    TeamsAttachment attachment = TeamsAttachment.CreateBuilder()
        .WithAdaptiveCard(JsonSerializer.SerializeToElement(card))
        .Build();

    return MessageExtensionActionResponse.CreateBuilder()
        .WithComposeExtension(MessageExtensionResponse.CreateBuilder()
            .WithType(MessageExtensionResponseTypes.Result)
            .WithAttachmentLayout(TeamsAttachmentLayouts.List)
            .WithAttachments(attachment))
        .Build();
}
```

</TabItem>
</Tabs>

<!-- create-message-details-function -->

`HandleGetMessageDetails()` method

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Api;
using Microsoft.Teams.Api.Activities.Invokes.MessageExtensions;
using Microsoft.Teams.Api.MessageExtensions;
using Microsoft.Teams.Cards;

//...

private static Response HandleGetMessageDetails(SubmitActionActivity activity, ILogger log)
{
    var messageText = activity.Value?.MessagePayload?.Body?.Content ?? "No message content";
    var messageId = activity.Value?.MessagePayload?.Id ?? "Unknown";

    log.Info($"[GET_MESSAGE_DETAILS] Message ID: {messageId}");

    var card = new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new TextBlock("Message Details")
            {
                Weight = TextWeight.Bolder,
                Size = TextSize.Large,
                Color = TextColor.Accent
            },
            new TextBlock($"Message ID: {messageId}")
            {
                Wrap = true
            },
            new TextBlock($"Content: {messageText}")
            {
                Wrap = true
            }
        }
    };

    var attachment = new Microsoft.Teams.Api.MessageExtensions.Attachment
    {
        ContentType = new ContentType("application/vnd.microsoft.card.adaptive"),
        Content = card
    };

    return new Response
    {
        ComposeExtension = new Result
        {
            Type = ResultType.Result,
            AttachmentLayout = Layout.List,
            Attachments = new List<Microsoft.Teams.Api.MessageExtensions.Attachment> { attachment }
        }
    };
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps.MessageExtensions;
using Microsoft.Teams.Apps.Schema;
using Microsoft.Teams.Cards;

//...

private static InvokeResponse<MessageExtensionActionResponse> HandleGetMessageDetails(MessageExtensionAction? action)
{
    var messageText = action?.MessagePayload?.Body?.Content ?? "No message content";
    var messageId = action?.MessagePayload?.Id ?? "Unknown";

    var card = new AdaptiveCard
    {
        Body = new List<CardElement>
        {
            new TextBlock("Message Details")
            {
                Weight = TextWeight.Bolder,
                Size = TextSize.Large,
                Color = TextColor.Accent
            },
            new TextBlock($"Message ID: {messageId}") { Wrap = true },
            new TextBlock($"Content: {messageText}") { Wrap = true }
        }
    };

    TeamsAttachment attachment = TeamsAttachment.CreateBuilder()
        .WithAdaptiveCard(JsonSerializer.SerializeToElement(card))
        .Build();

    return MessageExtensionActionResponse.CreateBuilder()
        .WithComposeExtension(MessageExtensionResponse.CreateBuilder()
            .WithType(MessageExtensionResponseTypes.Result)
            .WithAttachmentLayout(TeamsAttachmentLayouts.List)
            .WithAttachments(attachment))
        .Build();
}
```

</TabItem>
</Tabs>

<!-- handle-dialog-intro -->

Handle opening adaptive card dialog when the `fetchConversationMembers` command is invoked.

<!-- handle-dialog-code -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Api.Activities.Invokes.MessageExtensions;
using Microsoft.Teams.Api.MessageExtensions;
using Microsoft.Teams.Apps.Annotations;

//...

[MessageExtension.FetchTask]
public async Task<ActionResponse> OnMessageExtensionFetchTask(
    [Context] FetchTaskActivity activity,
    [Context] ILogger log)
{
    log.Info("[MESSAGE_EXT_FETCH_TASK] Fetch task received");

    var commandId = activity.Value?.CommandId;
    log.Info($"[MESSAGE_EXT_FETCH_TASK] Command: {commandId}");

    return CreateFetchTaskResponse(commandId, log);
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using Microsoft.Teams.Apps.MessageExtensions;

//...

bot.OnFetchTask(async (context, cancellationToken) =>
{
    MessageExtensionAction? action = context.Activity.Value;
    string? commandId = action?.CommandId;

    return CreateFetchTaskResponse(commandId);
});
```

</TabItem>
</Tabs>

<!-- create-conversation-members-function -->

`CreateFetchTaskResponse()` method

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Api;
using Microsoft.Teams.Api.MessageExtensions;
using Microsoft.Teams.Api.TaskModules;
using Microsoft.Teams.Cards;
using Microsoft.Teams.Common;

//...

private static ActionResponse CreateFetchTaskResponse(string? commandId, ILogger log)
{
    log.Info($"[CREATE_FETCH_TASK] Creating task for command: {commandId}");

    // Create an adaptive card for the task module
    var card = new AdaptiveCard
    {
        Body = new List<CardElement>
        {
            new TextBlock("Conversation Members is not implemented in C# yet :(")
            {
                Weight = TextWeight.Bolder,
                Color = TextColor.Accent
            },
        }
    };

    return new ActionResponse
    {
        Task = new ContinueTask(new TaskInfo
        {
            Title = "Fetch Task Dialog",
            Height = new Union<int, Size>(Size.Small),
            Width = new Union<int, Size>(Size.Small),
            Card = new Microsoft.Teams.Api.Attachment(card)
        })
    };
}

// Helper method to extract JSON values
private static string? GetJsonValue(JsonElement? data, string key)
{
    if (data?.ValueKind == JsonValueKind.Object && data.Value.TryGetProperty(key, out var value))
    {
        return value.GetString();
    }
    return null;
}

// Helper method to create error responses
private static Response CreateErrorActionResponse(string message)
{
    return new Response
    {
        ComposeExtension = new Result
        {
            Type = ResultType.Message,
            Text = message
        }
    };
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps.MessageExtensions;
using Microsoft.Teams.Apps.Schema;
using Microsoft.Teams.Apps.TaskModules;
using Microsoft.Teams.Cards;

//...

private static InvokeResponse<MessageExtensionActionResponse> CreateFetchTaskResponse(string? commandId)
{
    var card = new AdaptiveCard
    {
        Body = new List<CardElement>
        {
            new TextBlock("Conversation Members is not implemented in C# yet :(")
            {
                Weight = TextWeight.Bolder,
                Color = TextColor.Accent
            }
        }
    };

    TeamsAttachment attachment = TeamsAttachment.CreateBuilder()
        .WithAdaptiveCard(JsonSerializer.SerializeToElement(card))
        .Build();

    return MessageExtensionActionResponse.CreateBuilder()
        .WithTask(TaskModuleResponse.CreateBuilder()
            .WithType(TaskModuleResponseTypes.Continue)
            .WithTitle("Fetch Task Dialog")
            .WithHeight(TaskModuleSizes.Small)
            .WithWidth(TaskModuleSizes.Small)
            .WithCard(attachment))
        .Build();
}

// Helper method to extract JSON values
private static string? GetJsonValue(JsonElement? data, string key)
{
    if (data?.ValueKind == JsonValueKind.Object && data.Value.TryGetProperty(key, out var value))
        return value.GetString();
    return null;
}
```

</TabItem>
</Tabs>
