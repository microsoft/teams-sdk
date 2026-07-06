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

<!-- plugin-events -->

(onActivity, onActivitySent, etc.)

<!-- local-test-note -->

To test your agent locally without sideloading into Teams, run the **[Microsoft 365 Agents Playground](/developer-tools/agents-playground)** alongside your agent. The playground is a separate CLI tool and does not require a plugin in your app code.

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
