<!-- example -->

<Tabs groupId="proactive-activities">
  <TabItem value="Diff" default>
    ```typescript
    // highlight-error-start
-    import {
-      CloudAdapter,
-      ConfigurationBotFrameworkAuthentication,
-      ConversationReference,
-    } from 'botbuilder';
    // highlight-error-end
    // highlight-success-line
+    import { App } from '@microsoft/teams.apps';

    // highlight-error-start

- const auth = new ConfigurationBotFrameworkAuthentication(process.env);
- const adapter = new CloudAdapter(auth);
  // highlight-error-end
  // highlight-success-line

* const app = new App();


    (async () => {
      // highlight-error-start

-      const conversationReference: ConversationReference = {
-        serviceUrl: '...',
-        bot: { ... },
-        channelId: 'msteams',
-        conversation: { ... },
-        user: { ... },
-      };

-      await adapter.continueConversationAsync(process.env.MicrosoftAppId ?? '', conversationReference, async context => {
-        await context.sendActivity('proactive hello');
-      });
      // highlight-error-end
      // highlight-success-start

*      await app.start();
*      await app.send('your-conversation-id', 'proactive hello');
        // highlight-success-end
      }());
      ```

    </TabItem>
    <TabItem value="BotBuilder">
      ```typescript showLineNumbers
      import {
        CloudAdapter,
        ConfigurationBotFrameworkAuthentication,
        ConversationReference,
      } from 'botbuilder';

      const auth = new ConfigurationBotFrameworkAuthentication(process.env);
      const adapter = new CloudAdapter(auth);

      // highlight-start
      (async () => {
        const conversationReference: ConversationReference = {
          serviceUrl: '...',
          bot: { ... },
          channelId: 'msteams',
          conversation: { ... },
          user: { ... },
        };

        await adapter.continueConversationAsync(process.env.MicrosoftAppId ?? '', conversationReference, async context => {
          await context.sendActivity('proactive hello');
        });
      }());
      // highlight-end
      ```

    </TabItem>
    <TabItem value="Teams SDK">
      ```typescript showLineNumbers
      import { App } from '@microsoft/teams.apps';

      const app = new App();

      // highlight-start
      (async () => {
        await app.start();
        await app.send('your-conversation-id', 'proactive hello');
      }());
      // highlight-end
      ```

    </TabItem>
  </Tabs>
