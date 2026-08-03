<!-- imports -->

N/A

<!-- project-structure -->

```
quote-agent/
├── src/
│   └── index.ts      # Main application code
```

<!-- project-structure-description -->

- **src/**: Contains the main application code. The `index.ts` file is the entry point for your application.

<!-- app-class-code -->

```typescript title="src/index.ts"
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common/logging';

const app = new App();
```

The app configuration includes a variety of options that allow you to customize its behavior, including controlling the underlying server, authentication, and other settings.


<!-- plugins  -->
Plugins are a core part of the Teams SDK. They allow you to hook into various lifecycles of the application. The lifecycles include server events (start, stop, initialize, etc.), and also Teams Activity events (onActivity, onActivitySent, etc.)

<!-- plugins-note -->

N/A

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
