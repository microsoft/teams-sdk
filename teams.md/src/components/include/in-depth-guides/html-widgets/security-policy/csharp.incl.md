<!-- declare-code -->

```csharp
using Microsoft.Teams.Apps.HtmlWidget;

// Attach a security policy to the payload. The build helper carries it through
// to the widget block; omit it and the SDK applies a restrictive default.
var message = HtmlWidgetHelpers.BuildHtmlWidgetMessage(
    new HtmlWidgetPayload
    {
        Name = "Chart Widget",
        Html = "<div id=\"chart\"></div>",
        Domain = "https://teams.microsoft.com",
        SecurityPolicy = new HtmlWidgetSecurityPolicy
        {
            ConnectDomains = ["https://api.contoso.com"],
            ResourceDomains = ["'self'", "data:", "https://cdn.contoso.com"],
            FrameDomains = [],
            BaseUriDomains = [],
        },
    });

await context.Send(message, cancellationToken);
```

<!-- validate-code -->

```csharp
using Microsoft.Teams.Apps.HtmlWidget;

var html =
    "<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Roboto\">" +
    "<div style=\"font-family: Roboto, sans-serif;\">Validation demo</div>";

var policy = new HtmlWidgetSecurityPolicy
{
    ConnectDomains = [],
    ResourceDomains = ["'self'", "data:"],
    FrameDomains = [],
    BaseUriDomains = [],
};

// Run the audit only in development so it never executes in production.
var isDevelopment = builder.Environment.IsDevelopment();
if (isDevelopment)
{
    foreach (var w in HtmlWidgetHelpers.ValidateSecurityPolicy(html, policy))
    {
        Console.WriteLine($"{w.Source}: {w.Url} is not in {w.PolicyField}");
    }
}

// In development the audit above would warn that this HTML loads the Roboto
// stylesheet from fonts.googleapis.com and the font files from fonts.gstatic.com,
// so you would add both origins to ResourceDomains before shipping.
```
