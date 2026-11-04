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

    await context.SendAsync(message, cancellationToken);
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

await context.SendAsync(message, cancellationToken);
```

<!-- build-markdown-code -->

```csharp
using Microsoft.Teams.Apps.Schema;

// BuildHtmlWidgetMarkdown returns just the string, so you can compose several
// widgets into one message or splice a widget into text you already have.
var weather = HtmlWidgetHelpers.BuildHtmlWidgetMarkdown(
    new HtmlWidgetPayload
    {
        Name = "Weather",
        Html = "<div>Sunny, 72F</div>",
        Domain = "https://teams.microsoft.com",
    });

var forecast = HtmlWidgetHelpers.BuildHtmlWidgetMarkdown(
    new HtmlWidgetPayload
    {
        Name = "Forecast",
        Html = "<div>Rain tomorrow</div>",
        Domain = "https://teams.microsoft.com",
    });

var text = $"Today:\n\n{weather}\n\nLooking ahead:\n\n{forecast}";
await context.SendAsync(
    new MessageActivityInput { Text = text, TextFormat = TextFormats.ExtendedMarkdown },
    cancellationToken);
```
