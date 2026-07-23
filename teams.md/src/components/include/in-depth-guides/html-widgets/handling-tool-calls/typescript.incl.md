<!-- handler-code -->

```typescript
import { IHtmlWidgetCallToolResponse, IMcpUiCallToolResult } from '@microsoft/teams.api';

app.on('widget.callTool', async ({ activity }) => {
  const { name, arguments: args } = activity.value;

  let callToolResult: IMcpUiCallToolResult;
  switch (name) {
    case 'getTime':
      callToolResult = {
        content: [{ type: 'text', text: new Date().toLocaleTimeString() }],
        structuredContent: { time: new Date().toISOString() },
        isError: false,
      };
      break;
    default:
      callToolResult = {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
      break;
  }

  const response: IHtmlWidgetCallToolResponse = {
    responseType: 'htmlwidget/calltoolresult',
    callToolResult,
  };
  return response;
});
```

<!-- response-intro -->

Return an `IHtmlWidgetCallToolResponse` with `responseType` set to `htmlwidget/calltoolresult` and a `callToolResult` payload.
The result's `content` is an array of content blocks; `structuredContent` holds data the widget can render from; `isError` signals a failure.

<!-- response-code -->

```typescript
const callToolResult: IMcpUiCallToolResult = {
  content: [{ type: 'text', text: 'Refreshed!' }],
  structuredContent: { counter: 1, lastAction: 'refresh' },
  isError: false,
};

const response: IHtmlWidgetCallToolResponse = {
  responseType: 'htmlwidget/calltoolresult',
  callToolResult,
};
return response;
```
