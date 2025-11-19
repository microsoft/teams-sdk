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

```
hi from botbuilder...
hi from teams...
```
