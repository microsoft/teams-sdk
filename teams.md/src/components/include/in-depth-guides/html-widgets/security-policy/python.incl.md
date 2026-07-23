<!-- validate-code -->

```python
from microsoft_teams.api.models.html_widget import HtmlWidgetSecurityPolicy
from microsoft_teams.apps.utils.html_widget import validate_security_policy

html = (
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto">'
    '<div style="font-family: Roboto, sans-serif;">Validation demo</div>'
)

policy = HtmlWidgetSecurityPolicy(
    connect_domains=[],
    resource_domains=["'self'", "data:"],
    frame_domains=[],
    base_uri_domains=[],
)

warnings = validate_security_policy(html, policy)
for w in warnings:
    print(f"{w.source}: {w.url} is not in {w.policy_field}")

# Fix the policy based on the warnings before sending. Google Fonts loads the
# stylesheet from fonts.googleapis.com and the font files from fonts.gstatic.com,
# so both domains are needed even though only the stylesheet URL appears in the HTML.
corrected_policy = HtmlWidgetSecurityPolicy(
    connect_domains=[],
    resource_domains=["'self'", "data:", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
    frame_domains=[],
    base_uri_domains=[],
)
```

<!-- inject-code -->

```python
from microsoft_teams.apps.utils.html_widget import (
    InjectWidgetProtocolOptions,
    inject_widget_protocol,
)

html = inject_widget_protocol(
    "<body><h1>Hello</h1></body>",
    InjectWidgetProtocolOptions(
        name="My Widget",
        version="2.0.0",
        available_display_modes=["inline", "fullscreen"],
        notifications=["tool-result", "tool-input"],
    ),
)
```
