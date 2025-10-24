<!-- default-logger -->

`ConsoleLogger`

<!-- package-name -->

`@microsoft/teams.common`

<!-- custom-logger-example -->

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';

// initialize app with custom console logger
// set to debug log level
const app = new App({
  logger: new ConsoleLogger('echo', { level: 'debug' }),
});

app.on('message', async ({ send, activity, log }) => {
  log.debug(activity);
  await send({ type: 'typing' });
  await send(`you said "${activity.text}"`);
});

(async () => {
  await app.start();
})();
```
