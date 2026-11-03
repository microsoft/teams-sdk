<!-- handler-code -->

```typescript
import { buildCallToolResponse, IMcpUiCallToolResult } from '@microsoft/teams.api';

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

  return buildCallToolResponse(callToolResult);
});
```

<!-- response-intro -->

Return `buildCallToolResponse(result)`, which produces an `IHtmlWidgetCallToolResponse` with `responseType` set to `htmlwidget/calltoolresult` and the result as `callToolResult`.
The result's `content` is an array of content blocks; `structuredContent` holds data the widget can render from; `isError` signals a failure.
`buildCallToolResponse` always sets all three fields, defaulting to `[]`, `{}` and `false`, because an omitted field can reach the widget as `null`.
Use `buildCallToolResult(result)` when you need only the result without the response wrapper.

<!-- response-code -->

```typescript
import { buildCallToolResponse } from '@microsoft/teams.api';

const callToolResult: IMcpUiCallToolResult = {
  content: [{ type: 'text', text: 'Refreshed!' }],
  structuredContent: { counter: 1, lastAction: 'refresh' },
  isError: false,
};

return buildCallToolResponse(callToolResult);
```

<!-- context-intro -->

The `IHtmlWidgetCallToolContext` type describes the `__msteams__` entry, with optional `mcpUrl` and `correlationId` fields.

