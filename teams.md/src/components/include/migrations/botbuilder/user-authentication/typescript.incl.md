<!-- example -->

<Tabs groupId="user-auth">
  <TabItem value="Diff" default>
    ```typescript
    // highlight-error-start
-    import restify from 'restify';
-    import {
-      TeamsActivityHandler,
-      ConversationState,
-      UserState,
-      StatePropertyAccessor,
-      CloudAdapter,
-      ConfigurationBotFrameworkAuthentication,
-      MemoryStorage,
-    } from 'botbuilder';
    // highlight-error-end
    // highlight-success-start
+    import { App } from '@microsoft/teams.apps';
+    import { ConsoleLogger } from '@microsoft/teams.common/logging';
    // highlight-success-end

    // highlight-error-line

- import { OAuthPrompt, WaterfallDialog, ComponentDialog } from 'botbuilder-dialogs';

  // highlight-error-start

- export class ActivityHandler extends TeamsActivityHandler {
-      private readonly _conversationState: ConversationState;
-      private readonly _userState: UserState;
-      private readonly _dialog: SignInDialog;
-      private readonly _dialogState: StatePropertyAccessor;

-      constructor(connectionName: string, conversationState: ConversationState, userState: UserState) {
-        super();

-        this._conversationState = conversationState;
-        this._userState = userState;
-        this._dialog = new SignInDialog('signin', connectionName);
-        this._dialogState = this.conversationState.createProperty('DialogState');

-        this.onMessage(async (context, next) => {
-          await this._dialog.run(context, this._dialogState);
-          return next();
-        });
-      }

-      async run(context) {
-        await super.run(context);
-        await this.conversationState.saveChanges(context, false);
-        await this.userState.saveChanges(context, false);
-      }
- }
  // highlight-error-end

  // highlight-error-start

- export class SignInDialog extends ComponentDialog {
-      private readonly _connectionName: string;

-      constructor(id, connectionName: string) {
-        super(id);
-        this._connectionName = connectionName;

-        this.addDialog(new OAuthPrompt('OAuthPrompt', {
-          connectionName: connectionName,
-          text: 'Please Sign In',
-          title: 'Sign In',
-          timeout: 300000
-        }));

-        this.addDialog(new WaterfallDialog('Main', [
-          this.promptStep.bind(this),
-          this.loginStep.bind(this)
-        ]));

-        this.initialDialogId = 'Main';
-      }

-      async run(context, accessor) {
-        const dialogSet = new DialogSet(accessor);
-        dialogSet.add(this);

-        const dialogContext = await dialogSet.createContext(context);
-        const results = await dialogContext.continueDialog();

-        if (results.status === DialogTurnStatus.empty) {
-          await dialogContext.beginDialog(this.id);
-        }
-      }

-      async promptStep(stepContext) {
-        return await stepContext.beginDialog('OAuthPrompt');
-      }

-      async loginStep(stepContext) {
-        await stepContext.context.sendActivity('You have been signed in.');
-        return await stepContext.endDialog();
-      }

-      async onBeginDialog(innerDc, options) {
-        const result = await this.interrupt(innerDc);
-        if (result) return result;
-        return await super.onBeginDialog(innerDc, options);
-      }

-      async onContinueDialog(innerDc) {
-        const result = await this.interrupt(innerDc);
-        if (result) return result;
-        return await super.onContinueDialog(innerDc);
-      }

-      async interrupt(innerDc) {
-        if (innerDc.context.activity.type === ActivityTypes.Message) {
-          const text = innerDc.context.activity.text.toLowerCase();

-          if (text === '/signout') {
-            const userTokenClient = innerDc.context.turnState.get(innerDc.context.adapter.UserTokenClientKey);
-            const { activity } = innerDc.context;

-            await userTokenClient.signOutUser(activity.from.id, this.connectionName, activity.channelId);
-            await innerDc.context.sendActivity('You have been signed out.');
-            return await innerDc.cancelAllDialogs();
-          }
-        }
-      }
- }
  // highlight-error-end

  // highlight-error-start

- const server = restify.createServer();
- const auth = new ConfigurationBotFrameworkAuthentication(process.env);
- const adapter = new CloudAdapter(auth);
- const memoryStorage = new MemoryStorage();
- const conversationState = new ConversationState(memoryStorage);
- const userState = new UserState(memoryStorage);
- const handler = new ActivityHandler(
-      process.env.connectionName,
-      conversationState,
-      userState,
- );
  // highlight-error-end
  // highlight-success-start

* const app = new App({
*      oauth: {
*        defaultConnectionName: process.env.connectionName
*      }
* });

* app.message('/signout', async ({ send, signout, isSignedIn }) => {
*      if (!isSignedIn) return;
*      await signout();
*      await send('You have been signed out.');
* });

* app.on('message', async ({ send, signin, isSignedIn }) => {
*      if (!isSignedIn) {
*        return await signin();
*      }
* });

* app.event('signin', async ({ send }) => {
*      await send('You have been signed in.');
* });
  // highlight-success-end

  // // highlight-error-start

- server.use(restify.plugins.bodyParser());
- server.listen(process.env.port || process.env.PORT || 3978, function() {
-        console.log(`\n${ server.name } listening to ${ server.url }`);
- });

- server.post('/api/messages', async (req, res) => {
-        await adapter.process(req, res, (context) => bot.run(context));
- });
  // highlight-error-end
  // highlight-success-start

* (async () => {
*      await app.start();
* })();
  // highlight-success-end

      ```

    </TabItem>
    <TabItem value="BotBuilder">
      ```typescript showLineNumbers
      import restify from 'restify';
      import {
        TeamsActivityHandler,
        ConversationState,
        UserState,
        StatePropertyAccessor,
        CloudAdapter,
        ConfigurationBotFrameworkAuthentication,
        MemoryStorage,
      } from 'botbuilder';

      import { OAuthPrompt, WaterfallDialog, ComponentDialog } from 'botbuilder-dialogs';

      export class ActivityHandler extends TeamsActivityHandler {
        private readonly _conversationState: ConversationState;
        private readonly _userState: UserState;
        private readonly _dialog: SignInDialog;
        private readonly _dialogState: StatePropertyAccessor;

        constructor(connectionName: string, conversationState: ConversationState, userState: UserState) {
          super();

          this._conversationState = conversationState;
          this._userState = userState;
          this._dialog = new SignInDialog('signin', connectionName);
          this._dialogState = this.conversationState.createProperty('DialogState');

          this.onMessage(async (context, next) => {
            await this._dialog.run(context, this._dialogState);
            return next();
          });
        }

        async run(context) {
          await super.run(context);
          await this.conversationState.saveChanges(context, false);
          await this.userState.saveChanges(context, false);
        }
      }

      export class SignInDialog extends ComponentDialog {
        private readonly _connectionName: string;

        constructor(id, connectionName: string) {
          super(id);
          this._connectionName = connectionName;

          this.addDialog(new OAuthPrompt('OAuthPrompt', {
            connectionName: connectionName,
            text: 'Please Sign In',
            title: 'Sign In',
            timeout: 300000
          }));

          this.addDialog(new WaterfallDialog('Main', [
            this.promptStep.bind(this),
            this.loginStep.bind(this)
          ]));

          this.initialDialogId = 'Main';
        }

        async run(context, accessor) {
          const dialogSet = new DialogSet(accessor);
          dialogSet.add(this);

          const dialogContext = await dialogSet.createContext(context);
          const results = await dialogContext.continueDialog();

          if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
          }
        }

        async promptStep(stepContext) {
          return await stepContext.beginDialog('OAuthPrompt');
        }

        async loginStep(stepContext) {
          await stepContext.context.sendActivity('You have been signed in.');
          return await stepContext.endDialog();
        }

        async onBeginDialog(innerDc, options) {
          const result = await this.interrupt(innerDc);
          if (result) return result;
          return await super.onBeginDialog(innerDc, options);
        }

        async onContinueDialog(innerDc) {
          const result = await this.interrupt(innerDc);
          if (result) return result;
          return await super.onContinueDialog(innerDc);
        }

        async interrupt(innerDc) {
          if (innerDc.context.activity.type === ActivityTypes.Message) {
            const text = innerDc.context.activity.text.toLowerCase();

            if (text === '/signout') {
              const userTokenClient = innerDc.context.turnState.get(innerDc.context.adapter.UserTokenClientKey);
              const { activity } = innerDc.context;

              await userTokenClient.signOutUser(activity.from.id, this.connectionName, activity.channelId);
              await innerDc.context.sendActivity('You have been signed out.');
              return await innerDc.cancelAllDialogs();
            }
          }
        }
      }

      const server = restify.createServer();
      const auth = new ConfigurationBotFrameworkAuthentication(process.env);
      const adapter = new CloudAdapter(auth);
      const memoryStorage = new MemoryStorage();
      const conversationState = new ConversationState(memoryStorage);
      const userState = new UserState(memoryStorage);
      const handler = new ActivityHandler(
        process.env.connectionName,
        conversationState,
        userState,
      );

      server.use(restify.plugins.bodyParser());
      server.listen(process.env.port || process.env.PORT || 3978, function() {
          console.log(`\n${ server.name } listening to ${ server.url }`);
      });

      server.post('/api/messages', async (req, res) => {
          await adapter.process(req, res, (context) => bot.run(context));
      });
      ```

    </TabItem>
    <TabItem value="Teams SDK">
      ```typescript showLineNumbers
      import { App } from '@microsoft/teams.apps';
      import { ConsoleLogger } from '@microsoft/teams.common/logging';

      const app = new App({
        oauth: {
          defaultConnectionName: process.env.connectionName
        }
      });

      app.message('/signout', async ({ send, signout, isSignedIn }) => {
        if (!isSignedIn) return;
        await signout();
        await send('You have been signed out.');
      });

      app.on('message', async ({ send, signin, isSignedIn }) => {
        if (!isSignedIn) {
          return await signin();
        }
      });

      app.event('signin', async ({ send }) => {
        await send('You have been signed in.');
      });

      (async () => {
        await app.start();
      })();
      ```

    </TabItem>
  </Tabs>
