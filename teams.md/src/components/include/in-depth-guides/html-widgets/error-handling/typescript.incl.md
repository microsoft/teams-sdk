<!-- payload-validation -->

```typescript
import { buildHtmlWidgetMessage } from '@microsoft/teams.apps';

try {
  const message = buildHtmlWidgetMessage({
    name: 'Simple Widget',
    html: '<div>Hello from a widget</div>',
    domain: 'https://teams.microsoft.com',
  });
  await send(message);
} catch (err) {
  // Thrown when name or html is empty, or domain is not a valid https:// URL.
  console.error(`Invalid widget payload: ${(err as Error).message}`);
}
```

<!-- tool-error -->

```typescript
import { IHtmlWidgetCallToolResponse } from '@microsoft/teams.api';

app.on('widget.callTool', async ({ activity }) => {
  const { name } = activity.value;

  const response: IHtmlWidgetCallToolResponse = {
    responseType: 'htmlwidget/calltoolresult',
    callToolResult: {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    },
  };
  return response;
});
```
