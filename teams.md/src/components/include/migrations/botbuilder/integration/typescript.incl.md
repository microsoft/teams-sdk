<!-- example -->

<Tabs>
  <TabItem value="index.ts" default>
    ```typescript
    import { App } from '@microsoft/teams.apps';
    import { BotBuilderPlugin } from '@microsoft/teams.botbuilder';

    import adapter from './adapter';
    import handler from './activity-handler';

    const app = new App({
      // highlight-next-line
      plugins: [new BotBuilderPlugin({ adapter, handler })],
    });

    app.on('message', async ({ send }) => {
      await send('hi from teams...');
    });

    (async () => {
      await app.start();
    })();
    ```

  </TabItem>
  <TabItem value="adapter.ts">
    ```typescript
    import { CloudAdapter } from 'botbuilder';

    // replace with your BotAdapter
    // highlight-start
    const adapter = new CloudAdapter(
      new ConfigurationBotFrameworkAuthentication(
        {},
        new ConfigurationServiceClientCredentialFactory({
          MicrosoftAppType: tenantId ? 'SingleTenant' : 'MultiTenant',
          MicrosoftAppId: clientId,
          MicrosoftAppPassword: clientSecret,
          MicrosoftAppTenantId: tenantId,
        })
      )
    );
    // highlight-end

    export default adapter;
    ```

  </TabItem>
  <TabItem value="activity-handler.ts">
    ```typescript
    import { TeamsActivityHandler } from 'botbuilder';

    // replace with your TeamsActivityHandler
    // highlight-start
    export class ActivityHandler extends TeamsActivityHandler {
      constructor() {
        super();
        this.onMessage(async (ctx, next) => {
          await ctx.sendActivity('hi from botbuilder...');
          await next();
        });
      }
    }
    // highlight-end

    const handler = new ActivityHandler();
    export default handler;
    ```

  </TabItem>
</Tabs>

In this example:
- `adapter.ts` defines a `CloudAdapter`, which handles incoming activities, and can include middleware support or error handling.
- `activity-handler.ts` defines `ActivityHandler` (extending TeamsActivityHandler), containing the core bot logic, sending responses via the `ITurnContext`.
- `index.ts` sets up the Teams SDK `App` and registers the `BotBuilderPlugin` with your adapter and handler. It also defines a Teams SDK handler that responds to messages.

In the output, the first line comes from the BotBuilder `ActivityHandler`.
The second line comes from the Teams SDK handler.
This demonstrates that both handlers can process the same message sequentially when using the `BotBuilderPlugin`.

```
hi from botbuilder...
hi from teams...
```
