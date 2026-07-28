<!-- handle-submission-code -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Api.Activities.Invokes.MessageExtensions;
using Microsoft.Teams.Api.MessageExtensions;
using Microsoft.Teams.Apps.Annotations;

//...

[MessageExtension.Query]
public Response OnMessageExtensionQuery(
    [Context] QueryActivity activity,
    [Context] IContext.Client client,
    [Context] ILogger log)
{
    log.Info("[MESSAGE_EXT_QUERY] Search query received");

    var commandId = activity.Value?.CommandId;
    var query = activity.Value?.Parameters?.FirstOrDefault(p => p.Name == "searchQuery")?.Value?.ToString() ?? "";

    log.Info($"[MESSAGE_EXT_QUERY] Command: {commandId}, Query: {query}");

    if (commandId == "searchQuery")
    {
        return CreateSearchResults(query, log);
    }

    return new Response
    {
        ComposeExtension = new Result
        {
            Type = ResultType.Result,
            AttachmentLayout = Layout.List,
            Attachments = new List<Microsoft.Teams.Api.MessageExtensions.Attachment>()
        }
    };
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

```csharp
using Microsoft.Teams.Apps.MessageExtensions;

//...

bot.OnQuery(async (context, cancellationToken) =>
{
    MessageExtensionQuery? query = context.Activity.Value;
    string? commandId = query?.CommandId;
    string searchText = query?.Parameters?.FirstOrDefault(p => p.Name == "searchQuery")?.Value ?? "";

    if (commandId == "searchQuery")
    {
        return CreateSearchResults(searchText);
    }

    return MessageExtensionResponse.CreateBuilder()
        .WithType(MessageExtensionResponseTypes.Message)
        .WithText("Unknown command")
        .Build();
});
```

</TabItem>
</Tabs>

<!-- create-dummy-cards-function -->

`CreateSearchResults()` method

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Api.MessageExtensions;
using Microsoft.Teams.Cards;
using Microsoft.Teams.Common;

//...

private static Response CreateSearchResults(string query, ILogger log)
{
    var attachments = new List<Microsoft.Teams.Api.MessageExtensions.Attachment>();

    // Create simple search results
    for (int i = 1; i <= 5; i++)
    {
        var card = new AdaptiveCard
        {
            Body = new List<CardElement>
            {
                new TextBlock($"Search Result {i}")
                {
                    Weight = TextWeight.Bolder,
                    Size = TextSize.Large
                },
                new TextBlock($"Query: '{query}' - Result description for item {i}")
                {
                    Wrap = true,
                    IsSubtle = true
                }
            }
        };

        var previewCard = new ThumbnailCard()
        {
            Title = $"Result {i}",
            Text = $"This is a preview of result {i} for query '{query}'."
        };

        var attachment = new Microsoft.Teams.Api.MessageExtensions.Attachment
        {
            ContentType = ContentType.AdaptiveCard,
            Content = card,
            Preview = new Microsoft.Teams.Api.MessageExtensions.Attachment
            {
                ContentType = ContentType.ThumbnailCard,
                Content = previewCard
            }
        };

        attachments.Add(attachment);
    }

    return new Response
    {
        ComposeExtension = new Result
        {
            Type = ResultType.Result,
            AttachmentLayout = Layout.List,
            Attachments = attachments
        }
    };
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

```csharp
using Microsoft.Teams.Apps.MessageExtensions;
using Microsoft.Teams.Apps.Schema;

//...

private static InvokeResponse<MessageExtensionResponse> CreateSearchResults(string query)
{
    var attachments = new List<TeamsAttachment>();

    for (int i = 1; i <= 5; i++)
    {
        // Thumbnail cards with a tap/invoke value to trigger OnSelectItem
        var previewCard = new
        {
            title = $"Result {i}",
            text = $"This is a preview of result {i} for query '{query}'.",
            tap = new
            {
                type = "invoke",
                value = new { itemIndex = i, query }
            }
        };

        attachments.Add(TeamsAttachment.CreateBuilder()
            .WithContent(previewCard)
            .WithContentType(AttachmentContentTypes.ThumbnailCard)
            .Build());
    }

    return MessageExtensionResponse.CreateBuilder()
        .WithType(MessageExtensionResponseTypes.Result)
        .WithAttachmentLayout(TeamsAttachmentLayouts.List)
        .WithAttachments([.. attachments])
        .Build();
}
```

</TabItem>
</Tabs>

To implement custom actions when a user clicks on a search result item, you can handle the select item event:

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using System.Text.Json;
using Microsoft.Teams.Api;
using Microsoft.Teams.Api.Activities.Invokes.MessageExtensions;
using Microsoft.Teams.Api.MessageExtensions;
using Microsoft.Teams.Apps.Annotations;
using Microsoft.Teams.Cards;

//...

[MessageExtension.SelectItem]
public Response OnMessageExtensionSelectItem(
    [Context] SelectItemActivity activity,
    [Context] IContext.Client client,
    [Context] ILogger log)
{
    log.Info("[MESSAGE_EXT_SELECT_ITEM] Item selection received");

    var selectedItem = activity.Value;
    log.Info($"[MESSAGE_EXT_SELECT_ITEM] Selected: {JsonSerializer.Serialize(selectedItem)}");

    return CreateItemSelectionResponse(selectedItem, log);
}

// Helper method to create item selection response
private static Response CreateItemSelectionResponse(object? selectedItem, ILogger log)
{
    var itemJson = JsonSerializer.Serialize(selectedItem);

    var card = new AdaptiveCard
    {
        Schema = "http://adaptivecards.io/schemas/adaptive-card.json",
        Body = new List<CardElement>
        {
            new TextBlock("Item Selected")
            {
                Weight = TextWeight.Bolder,
                Size = TextSize.Large,
                Color = TextColor.Good
            },
            new TextBlock("You selected the following item:")
            {
                Wrap = true
            },
            new TextBlock(itemJson)
            {
                Wrap = true,
                FontType = FontType.Monospace,
                Separator = true
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
<TabItem value="core" label="SDK 2.1 (Preview)">

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps.MessageExtensions;
using Microsoft.Teams.Apps.Schema;
using Microsoft.Teams.Cards;

//...

bot.OnSelectItem(async (context, cancellationToken) =>
{
    JsonElement selectedItem = context.Activity.Value;
    string itemJson = JsonSerializer.Serialize(selectedItem);

    var card = new AdaptiveCard
    {
        Body = new List<CardElement>
        {
            new TextBlock("Item Selected")
            {
                Weight = TextWeight.Bolder,
                Size = TextSize.Large,
                Color = TextColor.Good
            },
            new TextBlock("You selected the following item:") { Wrap = true },
            new TextBlock(itemJson) { Wrap = true, FontType = FontType.Monospace, Separator = true }
        }
    };

    TeamsAttachment attachment = TeamsAttachment.CreateBuilder()
        .WithAdaptiveCard(JsonSerializer.SerializeToElement(card))
        .Build();

    return MessageExtensionResponse.CreateBuilder()
        .WithType(MessageExtensionResponseTypes.Result)
        .WithAttachmentLayout(TeamsAttachmentLayouts.List)
        .WithAttachments(attachment)
        .Build();
});
```

</TabItem>
</Tabs>

<!-- select-item-code -->

N/A
