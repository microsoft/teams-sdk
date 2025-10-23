<!-- handle-submission-code -->

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

<!-- create-dummy-cards-function -->

`CreateSearchResults()` method

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

To implement custom actions when a user clicks on a search result item, you can handle the select item event:

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

<!-- select-item-code -->

N/A
