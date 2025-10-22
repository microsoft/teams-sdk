<!-- imports -->

N/A

<!-- project-structure -->

```
quote-agent/
|── appPackage/       # Teams app package files
├── src/
│   └── index.ts      # Main application code
```

<!-- project-structure-description -->

- **appPackage/**: Contains the Teams app package files, including the `manifest.json` file and icons. This is required for [sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) the app into Teams for testing. The app manifest defines the app's metadata, capabilities, and permissions.
- **src/**: Contains the main application code. The `index.ts` file is the entry point for your application.

<!-- app-class-code -->

```typescript title="src/index.ts"
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common/logging';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  plugins: [new DevtoolsPlugin()],
});
```

<!-- plugin-events -->

(onActivity, onActivitySent, etc.)

<!-- message-handling-code -->

```typescript title="src/index.ts"
app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });
  await send(`you said "${activity.text}"`);
});
```

<!-- message-handling-step1 -->

Listens for all incoming messages using `app.on('message')`.

<!-- message-handling-step3 -->

Responds by echoing back the received message.

<!-- message-handling-info -->

:::info
Type safety is a core tenet of this version of the SDK. You can change the activity `name` to a different supported value, and the type system will automatically adjust the type of activity to match the new value.
:::

<!-- app-lifecycle-code -->

```typescript title="src/index.ts"
await app.start();
```
