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

const warnings = validateSecurityPolicy(html, policy);
for (const w of warnings) {
  console.log(`${w.source}: ${w.url} is not in ${w.policyField}`);
}

// Fix the policy based on the warnings before sending.
const correctedPolicy = {
  ...policy,
  resourceDomains: [...policy.resourceDomains, 'https://fonts.googleapis.com'],
};
```

<!-- inject-code -->

```typescript
import { injectWidgetProtocol } from '@microsoft/teams.apps';

const html = injectWidgetProtocol('<body><h1>Hello</h1></body>', {
  name: 'My Widget',
  version: '2.0.0',
  appCapabilities: { availableDisplayModes: ['inline', 'fullscreen'] },
  notifications: ['tool-result', 'tool-input'],
});
```
