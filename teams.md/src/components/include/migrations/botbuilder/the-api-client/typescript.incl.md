<!-- example -->

<Tabs groupId="api-client">
  <TabItem value="Diff" default>
  ```typescript
  // highlight-error-start
-  import {
-    CloudAdapter,
-    ConfigurationBotFrameworkAuthentication,
-    TeamsInfo,
-  } from 'botbuilder';
  // highlight-error-end
  // highlight-success-line
+  import { App } from '@microsoft/teams.apps';

  // highlight-error-start
-  const auth = new ConfigurationBotFrameworkAuthentication(process.env);
-  const adapter = new CloudAdapter(auth);
  // highlight-error-end
  // highlight-success-line
+  const app = new App();

  // highlight-error-start
-  export class ActivityHandler extends TeamsActivityHandler {
-    constructor() {
-      super();
-      this.onMessage(async (context) => {
-        const members = await TeamsInfo.getMembers(context);
-      });
-    }
-  }
  // highlight-error-end
  // highlight-success-start
+  app.on('message', async ({ api, activity }) => {
+    const members = await api.conversations.members(activity.conversation.id).get();
+  });
  // highlight-success-end
  ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```typescript showLineNumbers
    import {
      CloudAdapter,
      ConfigurationBotFrameworkAuthentication,
      TeamsInfo,
    } from 'botbuilder';

    const auth = new ConfigurationBotFrameworkAuthentication(process.env);
    const adapter = new CloudAdapter(auth);

    export class ActivityHandler extends TeamsActivityHandler {
      constructor() {
        super();
        this.onMessage(async (context) => {
          // highlight-next-line
          const members = await TeamsInfo.getMembers(context);
        });
      }
    }
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```typescript showLineNumbers
    import { App } from '@microsoft/teams.apps';

    const app = new App();

    app.on('message', async ({ api, activity }) => {
      // highlight-next-line
      const members = await api.conversations.members(activity.conversation.id).get();
    });
    ```
  </TabItem>
</Tabs>