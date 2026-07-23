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

var warnings = HtmlWidgetHelpers.ValidateSecurityPolicy(html, policy);
foreach (var w in warnings)
{
    Console.WriteLine($"{w.Source}: {w.Url} is not in {w.PolicyField}");
}

// Fix the policy based on the warnings before sending.
var correctedPolicy = new HtmlWidgetSecurityPolicy
{
    ConnectDomains = [],
    ResourceDomains = ["'self'", "data:", "https://fonts.googleapis.com"],
    FrameDomains = [],
    BaseUriDomains = [],
};
```

<!-- inject-code -->

```csharp
var html = HtmlWidgetHelpers.InjectWidgetProtocol(
    "<body><h1>Hello</h1></body>",
    new InjectWidgetProtocolOptions
    {
        Name = "My Widget",
        Version = "2.0.0",
        AvailableDisplayModes = ["inline", "fullscreen"],
        Notifications = ["tool-result", "tool-input"],
    });
```
