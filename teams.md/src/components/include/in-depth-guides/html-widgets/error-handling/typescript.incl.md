<!-- payload-validation -->

```typescript
import { buildHtmlWidgetMessage } from '@microsoft/teams.apps';

let message;
try {
  message = buildHtmlWidgetMessage({
    name: 'Simple Widget',
    html: '<div>Hello from a widget</div>',
    domain: 'https://teams.microsoft.com',
  });
} catch (err) {
  // Thrown when name or html is empty, or domain is not a valid https:// URL.
  console.error(`Invalid widget payload: ${(err as Error).message}`);
  return;
}

await send(message);
```

<!-- tool-error -->

```typescript
import { buildCallToolResponse } from '@microsoft/teams.api';

app.on('widget.callTool', async ({ activity }) => {
  const { name } = activity.value;

  return buildCallToolResponse({
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    isError: true,
  });
});
```
