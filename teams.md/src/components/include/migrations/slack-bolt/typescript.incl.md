<!-- installation -->

First, let's install Teams SDK into your project. Notably, this won't replace any existing installation of Teams SDK. When you've completed your migration, you can safely remove the `@microsoft/teams-ai` dependency from your `package.json` file.

```sh
npm install @microsoft/teams.apps
```

<!-- application -->

First, let's configure the `App` class in Teams JS. This is equivalent to Slack Bolt's `App` class.

<Tabs>
  <TabItem value="Diff" default>

  ```ts
    // Setup app
    // highlight-error-start
    import { App } from '@slack/bolt';

    const app = new App({
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        scopes: [
            "channels:manage",
            "channels:read",
            "chat:write",
            "groups:read",
            "incoming-webhook",
        ],
        installerOptions: {
            authVersion: "v2",
            directInstall: false,
            installPath: "/slack/install",
            metadata: "",
            redirectUriPath: "/slack/oauth_redirect",
            stateVerification: "true",
            /**
            * Example pages to navigate to on certain callbacks.
            */
            callbackOptions: {
                success: (installation, installUrlOptions, req, res) => {
                    res.send("The installation succeeded!");
                },
                failure: (error, installUrlOptions, req, res) => {
                    res.send("Something strange happened...");
                },
            },
            /**
            * Example validation of installation options using a random state and an
            * expiration time between requests.
            */
            stateStore: {
                generateStateParam: async (installUrlOptions, now) => {
                    const state = randomStringGenerator();
                    const value = { options: installUrlOptions, now: now.toJSON() };
                    await database.set(state, value);
                    return state;
                },
                verifyStateParam: async (now, state) => {
                    const value = await database.get(state);
                    const generated = new Date(value.now);
                    const seconds = Math.floor(
                        (now.getTime() - generated.getTime()) / 1000,
                    );
                    if (seconds > 600) {
                        throw new Error("The state expired after 10 minutes!");
                    }
                    return value.options;
                },
            },
        },
    });
    // highlight-error-end
    // highlight-success-start
    import { App } from '@microsoft/teams.apps';

    // Define app
    const app = new App({
        clientId: process.env.ENTRA_APP_CLIENT_ID!,
        clientSecret: process.env.ENTRA_APP_CLIENT_SECRET!,
        tenantId: process.env.ENTRA_TENANT_ID!,
    });
    // highlight-success-end

    // App starts local server with route for /api/messages
    (async () => {
        await app.start();
    })();
    ```
  </TabItem>
  <TabItem value="slack" label="Slack Bolt">

    ```ts
    import { App } from '@slack/bolt';

    const app = new App({
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        scopes: [
            "channels:manage",
            "channels:read",
            "chat:write",
            "groups:read",
            "incoming-webhook",
        ],
        installerOptions: {
            authVersion: "v2",
            directInstall: false,
            installPath: "/slack/install",
            metadata: "",
            redirectUriPath: "/slack/oauth_redirect",
            stateVerification: "true",
            /**
            * Example pages to navigate to on certain callbacks.
            */
            callbackOptions: {
                success: (installation, installUrlOptions, req, res) => {
                    res.send("The installation succeeded!");
                },
                failure: (error, installUrlOptions, req, res) => {
                    res.send("Something strange happened...");
                },
            },
            /**
            * Example validation of installation options using a random state and an
            * expiration time between requests.
            */
            stateStore: {
                generateStateParam: async (installUrlOptions, now) => {
                    const state = randomStringGenerator();
                    const value = { options: installUrlOptions, now: now.toJSON() };
                    await database.set(state, value);
                    return state;
                },
                verifyStateParam: async (now, state) => {
                    const value = await database.get(state);
                    const generated = new Date(value.now);
                    const seconds = Math.floor(
                        (now.getTime() - generated.getTime()) / 1000,
                    );
                    if (seconds > 600) {
                        throw new Error("The state expired after 10 minutes!");
                    }
                    return value.options;
                },
            },
        },
    });

    // App starts local server with route for /slack/events
    (async () => {
        await app.start();
    })();
    ```
  </TabItem>
  <TabItem value="teams" label="Teams SDK">

    ```ts
    import { App } from '@microsoft/teams.apps';

    // Define app
    const app = new App({
        clientId: process.env.ENTRA_APP_CLIENT_ID!,
        clientSecret: process.env.ENTRA_APP_CLIENT_SECRET!,
        tenantId: process.env.ENTRA_TENANT_ID!,
    });

    // App starts local server with route for /api/messages
    // To reuse your restify or other server,
    // create a custom `HttpPlugin`.
    (async () => {
        await app.start();
    })();
    ```
  </TabItem>
</Tabs>

<!-- message-handlers -->

<Tabs>
  <TabItem value="Diff" default>

    ```ts
    // triggers user sends "hi" or "@bot hi"
    // highlight-error-start
    app.message("hi", async ({ message, say }) => {
        // Handle only newly posted messages here
        if (message.subtype) return;
        await say(`Hello, <@${message.user}>`);
    });
    // highlight-error-end
    // highlight-success-start
    app.message("hi", async (client) => {
      await client.send(`Hello, ${client.from.name}!`);
    });
    // highlight-success-end
    // listen for ANY message to be received
    // highlight-error-start
    app.message(async ({ message, say }) => {
        // Handle only newly posted messages here
        if (message.subtype) return;
        // echo back users request
        await say(`you said: ${message.text}`);
    });
    // highlight-error-end
    // highlight-success-start
    app.on('message', async (client) => {
        // echo back users request
        await client.send(
            `you said: ${client.activity.text}`
        );
    });
    // highlight-success-end
    ```
  </TabItem>
  <TabItem value="slack" label="Slack Bolt">

    ```ts
    // triggers when user sends a message containing "hi"
    app.message("hi", async ({ message, say }) => {
        // Handle only newly posted messages here
        if (message.subtype) return;
        await say(`Hello, <@${message.user}>`);
    });
    // listen for ANY message
    app.message(async ({ message, say }) => {
        // Handle only newly posted messages here
        if (message.subtype) return;
        // echo back users request
        await say(`you said: ${message.text}`);
    });
    ```
  </TabItem>
  <TabItem value="teams" label="Teams SDK">

    ```ts
    // triggers when user sends "hi" or "@bot hi"
    app.message("hi", async (client) => {
      await client.send(`Hello, ${client.from.name}!`);
    });
    // listen for ANY message to be received
    app.on('message', async (client) => {
        // echo back users request
        await client.send(
            `you said: ${client.activity.text}`
        );
    });
    ```
  </TabItem>
</Tabs>

<!-- adaptive-cards -->

<Tabs>
  <TabItem value="Diff" default>

    ```ts
    // highlight-error-start
    app.message('card', async (client) => {
        await say({
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'plain_text',
                        text: 'Hello, world!',
                    },
                },
            ],
        });
    });
    // highlight-error-end
    // highlight-success-start
    import { Card, TextBlock } from '@microsoft/teams.cards';      

    app.message('/card', async (client) => {
        await client.send(
            new Card(new TextBlock('Hello, world!', { wrap: true, isSubtle: false }))
                .withOptions({
                    width: 'Full',
                })
        );
    });
    // highlight-success-end
    ```
  </TabItem>
  <TabItem value="slack" label="Slack Bolt">
    For existing cards like this, the simplest way to convert that to Teams SDK is this:

    ```ts
    app.message('card', async (client) => {
        await say({
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'plain_text',
                        text: 'Hello, world!',
                    },
                },
            ],
        });
    });
    ```

  </TabItem>
  <TabItem value="teams" label="Teams SDK">
    For a more thorough port, you could also do the following:

    ```ts
    import { Card, TextBlock } from '@microsoft/teams.cards';

    app.message('/card', async (client) => {
      await client.send(
        new Card(new TextBlock('Hello, world!', { wrap: true, isSubtle: false })).withOptions({
          width: 'Full',
        })
      );
    });
    ```

  </TabItem>
</Tabs>

<!-- graph -->

<Tabs>
  <TabItem value="Diff" default>

    ```ts
    // highlight-error-start
    // TODO: Configure App class with user OAuth permissions and install app for user

    app.message('me', async ({ client, message }) => {
        const me = await client.users.info({ user: message.user });
        await client.send(JSON.stringify(me));
    });
    // highlight-error-end
    // highlight-success-start
    import { App } from '@microsoft/teams.apps';
    import * as endpoints from '@microsoft/teams.graph-endpoints';

    const app = new App({
        // ... rest of App config
        oauth: {
            // The key here should match the OAuth Connection setting
            // defined in your Azure Bot resource.
            defaultConnectionName: 'graph',
        },
    });

    app.message('me', async (client) => {
        if (!client.isSignedIn) {
            // Sign in if not already
            return await client.signin();
        }
        const me = await client.userGraph.call(endpoints.me.get);
        await client.send(JSON.stringify(me));
    });
    // highlight-success-end
    ```

  </TabItem>
  <TabItem value="slack" label="Slack Bolt">

    ```ts
    // TODO: Configure App class with user OAuth permissions and install app for user

    app.message('me', async ({ client, message }) => {
        const me = await client.users.info({ user: message.user });
        await client.send(JSON.stringify(me));
    });
    ```

  </TabItem>
  <TabItem value="teams" label="Teams SDK">

    ```ts
    import { App } from '@microsoft/teams.apps';
    import * as endpoints from '@microsoft/teams.graph-endpoints';

    const app = new App({
        // ... rest of App config
        oauth: {
            // The key here should match the OAuth Connection setting
            // defined in your Azure Bot resource.
            defaultConnectionName: 'graph',
        },
    });

    app.message('me', async (client) => {
        if (!client.isSignedIn) {
            // Sign in if not already
            return await client.signin();
        }
        const me = await client.userGraph.call(endpoints.me.get);
        await client.send(JSON.stringify(me));
    });
    ```

  </TabItem>
</Tabs>

<!-- 3p-auth -->

```ts
import { App } from '@microsoft/teams.apps';

const app = new App({
    // ... rest of App config
    oauth: {
        // The key here should match the OAuth Connection setting
        // defined in your Azure Bot resource.
        defaultConnectionName: 'custom',
    },
});

app.message('me', async (client) => {
    // In production, it is probably better to implement a local cache.
    // (e.g. \`client.activity.from.id\` <-> token).
    // Otherwise this triggers an API call to Azure Token Service on every inbound message.
    const token = await client.signin();
    
    // Call external API
    const response = await fetch('https://example.com/api/helloworld', {
        method: 'POST',
        headers: {
            "Authorization": client.token,
        },
    });
    const result = await res.json();
    await client.send(JSON.stringify(result));
});
```
