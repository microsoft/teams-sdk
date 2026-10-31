<!-- build-message-code -->

```typescript
import { App, buildHtmlWidgetMessage } from '@microsoft/teams.apps';

const app = new App();

app.on('message', async ({ send }) => {
  const message = buildHtmlWidgetMessage({
    name: 'Simple Widget',
    html: '<div>Hello from a widget</div>',
    domain: 'https://teams.microsoft.com',
  });

  await send(message);
});
```

<!-- before-after-code -->

```typescript
const message = buildHtmlWidgetMessage(
  {
    name: 'Simple Widget',
    html: '<div>Hello from a widget</div>',
    domain: 'https://teams.microsoft.com',
  },
  {
    before: 'Here is a simple static widget:',
    after: 'No callbacks needed for static content.',
  }
);

await send(message);
```

<!-- build-markdown-code -->

```typescript
import { buildHtmlWidgetMarkdown } from '@microsoft/teams.apps';

// buildHtmlWidgetMarkdown returns just the string, so you can compose several
// widgets into one message or splice a widget into text you already have.
const weather = buildHtmlWidgetMarkdown({
  name: 'Weather',
  html: '<div>Sunny, 72F</div>',
  domain: 'https://teams.microsoft.com',
});

const forecast = buildHtmlWidgetMarkdown({
  name: 'Forecast',
  html: '<div>Rain tomorrow</div>',
  domain: 'https://teams.microsoft.com',
});

await send({
  type: 'message',
  text: `Today:\n\n${weather}\n\nLooking ahead:\n\n${forecast}`,
  textFormat: 'extendedmarkdown',
});
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
