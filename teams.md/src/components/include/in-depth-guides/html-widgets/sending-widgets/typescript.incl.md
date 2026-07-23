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

const markdown = buildHtmlWidgetMarkdown(
  {
    name: 'Simple Widget',
    html: '<div>Hello from a widget</div>',
    domain: 'https://teams.microsoft.com',
  },
  { before: 'Here is a simple static widget:' }
);

await send({ type: 'message', text: markdown, textFormat: 'extendedmarkdown' });
```
