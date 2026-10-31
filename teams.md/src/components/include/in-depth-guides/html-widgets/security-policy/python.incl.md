<!-- declare-code -->

```python
from microsoft_teams.api.models.html_widget import HtmlWidgetPayload, HtmlWidgetSecurityPolicy
from microsoft_teams.apps.utils.html_widget import build_html_widget_message

# Attach a security policy to the payload. The build helper carries it through
# to the widget block; omit it and the SDK applies a restrictive default.
message = build_html_widget_message(
    HtmlWidgetPayload(
        name="Chart Widget",
        html='<div id="chart"></div>',
        domain="https://teams.microsoft.com",
        security_policy=HtmlWidgetSecurityPolicy(
            connect_domains=["https://api.contoso.com"],
            resource_domains=["'self'", "data:", "https://cdn.contoso.com"],
            frame_domains=[],
            base_uri_domains=[],
        ),
    )
)

await ctx.send(message)
```

<!-- validate-code -->

```python
import os

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

# Run the audit only in development so it never executes in production.
is_development = os.environ.get("ENV") != "production"
if is_development:
    for w in validate_security_policy(html, policy):
        print(f"{w.source}: {w.url} is not in {w.policy_field}")

# In development the audit above would warn that this HTML loads the Roboto
# stylesheet from fonts.googleapis.com and the font files from fonts.gstatic.com,
# so you would add both origins to resource_domains before shipping.
```
