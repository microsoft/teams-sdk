<!-- parse-code -->

```typescript
import { App, tryGetWidgetModelContext } from '@microsoft/teams.apps';

const app = new App();

app.on('message', async ({ activity, send }) => {
  const modelContext = tryGetWidgetModelContext(activity);
  if (modelContext) {
    // Use modelContext.params.content / modelContext.params.structuredContent
    // to update your model context for future turns. No response is sent.
    console.log('model context update:', modelContext.params);
    return;
  }

  // ... handle other messages
});
```
