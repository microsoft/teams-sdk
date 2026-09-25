<!-- declare-code -->

```typescript
import { buildHtmlWidgetMessage } from '@microsoft/teams.apps';

// Attach a securityPolicy to the payload. The build helper carries it through
// to the widget block; omit it and the SDK applies a restrictive default.
const message = buildHtmlWidgetMessage({
  name: 'Chart Widget',
  html: '<div id="chart"></div>',
  domain: 'https://teams.microsoft.com',
  securityPolicy: {
    connectDomains: ['https://api.contoso.com'],
    resourceDomains: ["'self'", 'data:', 'https://cdn.contoso.com'],
    frameDomains: [],
    baseUriDomains: [],
  },
});

await send(message);
```

<!-- validate-code -->

```typescript
import { validateSecurityPolicy } from '@microsoft/teams.apps';

const html = `
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto">
  <div style="font-family: Roboto, sans-serif;">Validation demo</div>`;

const policy = {
  connectDomains: [],
  resourceDomains: ["'self'", 'data:'],
  frameDomains: [],
  baseUriDomains: [],
};

// Run the audit only in development so it never executes in production.
const isDevelopment = process.env.NODE_ENV !== 'production';
if (isDevelopment) {
  const warnings = validateSecurityPolicy(html, policy);
  for (const w of warnings) {
    console.warn(`${w.source}: ${w.url} is not in ${w.policyField}`);
  }
}

// In development the audit above would warn that this HTML loads the Roboto
// stylesheet from fonts.googleapis.com and the font files from fonts.gstatic.com,
// so you would add both origins to resourceDomains before shipping.
```
