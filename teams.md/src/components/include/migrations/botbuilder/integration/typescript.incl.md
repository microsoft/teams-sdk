<!-- plugin-overview -->

# Adapters
A BotBuilder `CloudAdapter` is responsible for managing communication between a bot and its users.
It serves as the entry point for incoming activities and forwards them to the registered `ActivityHandler` for processing.
You can customize the adapter to add middleware for logging, authentication, and define error handling.

The BotBuilder integration layer in Teams SDK connects the SDK with BotBuilder components.
It lets you keep an existing `CloudAdapter` and `ActivityHandler` while migrating hosting/runtime integration into Teams SDK.

# Activity Handlers
The BotBuilder `ActivityHandler` contains the actual bot logic for processing messages or events,
similar to how the Teams SDK `App` routes messages and events. You can override any number of methods,
such as `OnMembersAdded` or `onMessage`, to handle different activity types.

# Turn Context
Each incoming activity is wrapped in a `TurnContext`, which represents the context of a single turn in the conversation.
TurnContext provides access to:
- The incoming activity (message, event).
- Services for sending responses back to the user.
- Conversation, user, and channel metadata.

Teams SDK has `IActivityContext` for the same purpose.

# How it all comes together

The `CloudAdapter` creates the `TurnContext`, and the `ActivityHandler` uses it to read the activity and send responses.

With the `BotBuilderPlugin`, when a message or activity is received:
1. The BotBuilder ActivityHandler runs first, handling the activity according to standard Bot Framework logic.
2. The Teams SDK app based activity handlers execute afterward, allowing Teams SDK logic to execute.

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
- `adapter.ts` defines a `CloudAdapter` to handle incoming activities, and can include middleware support or error handling.
- `activity-handler.ts` defines the `ActivityHandler` and contains the core bot logic.
- `index.ts` sets up a Teams SDK `app` and registers the `BotBuilderPlugin` with your adapter and activity handler.

This strategy can be used to incrementally migrate from BotBuilder to the Teams SDK.

```
hi from botbuilder...
hi from teams...
```

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
