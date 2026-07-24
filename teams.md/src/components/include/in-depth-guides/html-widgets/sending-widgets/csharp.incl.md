<!-- build-message-code -->

```csharp
using Microsoft.Teams.Apps.HtmlWidget;

teams.OnMessage(async (context, cancellationToken) =>
{
    var message = HtmlWidgetHelpers.BuildHtmlWidgetMessage(
        new HtmlWidgetPayload
        {
            Name = "Simple Widget",
            Html = "<div>Hello from a widget</div>",
            Domain = "https://teams.microsoft.com",
        });

    await context.Send(message, cancellationToken);
});
```

<!-- before-after-code -->

```csharp
var message = HtmlWidgetHelpers.BuildHtmlWidgetMessage(
    new HtmlWidgetPayload
    {
        Name = "Simple Widget",
        Html = "<div>Hello from a widget</div>",
        Domain = "https://teams.microsoft.com",
    },
    new HtmlWidgetMarkdownOptions
    {
        Before = "Here is a simple static widget:",
        After = "No callbacks needed for static content.",
    });

await context.Send(message, cancellationToken);
```

<!-- build-markdown-code -->

```csharp
using Microsoft.Teams.Apps.Schema;

var markdown = HtmlWidgetHelpers.BuildHtmlWidgetMarkdown(
    new HtmlWidgetPayload
    {
        Name = "Simple Widget",
        Html = "<div>Hello from a widget</div>",
        Domain = "https://teams.microsoft.com",
    },
    new HtmlWidgetMarkdownOptions { Before = "Here is a simple static widget:" });

await context.Send(
    new MessageActivityInput { Text = markdown, TextFormat = TextFormats.ExtendedMarkdown },
    cancellationToken);
```
