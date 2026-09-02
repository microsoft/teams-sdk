<!-- create-project -->
## Project Setup

:::tip
If you're creating a new app, use the `graph` template. Skip this if you're adding auth to an existing app.
:::

Use your terminal to run the following command:

```sh
teams project new typescript oauth-app --template graph
```

This command:

1. Creates a new directory called `oauth-app`.
2. Bootstraps the graph agent template files into it under `oauth-app/src`.

<!-- configure-oauth -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="typescript-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```ts
import { App } from '@microsoft/teams.apps';

const app = new App({
  oauth: {
    // The name of the auth connection to use.
    // It should be the same as the OAuth connection name defined in the Azure Bot configuration.
    defaultConnectionName: 'graph',
  },
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

Register the connections you plan to use. `addOAuthFlow` returns the object that owns one.

```ts
import { App } from '@microsoft/teams.apps';

const app = new App();

// Or register up front: new App({ oauthFlows: ['graph'] })
const graph = app.addOAuthFlow('graph', {
  oauthCardText: 'Sign in to your account',
  signInButtonText: 'Sign in',
});
```

Both card options are optional. Use `app.getOAuthFlow('graph')` to get the flow again from another module.

:::note
Registering a flow enables per-turn state unless you set `state` yourself, so sign-in callbacks that don't name a connection can be traced back to the one that started them. `oauth.defaultConnectionName` can't be combined with registered flows.
:::

  </TabItem>
</Tabs>

<!-- signing-in -->

:::note
This uses the Single Sign-On (SSO) authentication flow. To learn more about all the available flows and their differences see the [official documentation](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-authentication?view=azure-bot-service-4.0).
:::

<Tabs groupId="typescript-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```ts
app.message('/signin', async ({ signin, send }) => {
  if (await signin()) {
    await send('you are already signed in!');
  }
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

```ts
app.message('/signin', async (ctx) => {
  const token = await graph.signIn(ctx);
  if (token) {
    await ctx.send('you are already signed in!');
  }
});
```

  </TabItem>
</Tabs>

<!-- signin-event -->

<Tabs groupId="typescript-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```ts
app.event('signin', async ({ send, token }) => {
  await send(
    `Signed in using OAuth connection ${token.connectionName}. Please type **/whoami** to see your profile or **/signout** to sign out.`
  );
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

The callback is scoped to its connection, so there's no need to branch on the connection name.

```ts
graph.onSignInComplete(async (ctx, token) => {
  await ctx.send(
    `Signed in on ${token.connectionName}. Please type **/whoami** to see your profile or **/signout** to sign out.`
  );
});
```

:::note
Each flow holds a single completion callback — registering again replaces the previous one. The app-wide `signin` event still fires for every connection if you need one place to observe them all.
:::

  </TabItem>
</Tabs>

<!-- using-graph -->

From this point, you can query graph for the signed-in user, for example to reply to the `/whoami` message, or in any other route.

<Tabs groupId="typescript-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

Use the `isSignedIn` flag and the `userGraph` client.

```ts
import * as endpoints from '@microsoft/teams.graph-endpoints';

app.message('/whoami', async ({ send, userGraph, signin }) => {
  if (!await signin()) {
    return;
  }
  const me = await userGraph.call(endpoints.me.get);
  await send(
    `you are signed in as "${me.displayName}" and your email is "${me.mail || me.userPrincipalName}"`
  );
});

app.on('message', async ({ send, activity, signin }) => {
  if (await signin()) {
    await send(
      `You said: "${activity.text}". Please type **/whoami** to see your profile or **/signout** to sign out.`
    );
  } else {
    await send(`You said: "${activity.text}". Please type **/signin** to sign in.`);
  }
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

Build the client from the flow's token, so it always talks to the connection that owns it.

```ts
import { Client as GraphClient } from '@microsoft/teams.graph';
import * as endpoints from '@microsoft/teams.graph-endpoints';

app.message('/whoami', async (ctx) => {
  const token = await graph.signIn(ctx);
  if (!token) return; // OAuth card sent — resumes on the callback turn

  const client = new GraphClient({ token: () => token }, { baseUrlRoot: app.graphBaseUrl });
  const me = await client.call(endpoints.me.get);
  await ctx.send(
    `you are signed in as "${me.displayName}" and your email is "${me.mail || me.userPrincipalName}"`
  );
});
```

  </TabItem>
</Tabs>

<!-- signing-out -->

<Tabs groupId="typescript-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```ts
app.message('/signout', async ({ send, signout, isSignedIn }) => {
  if (!isSignedIn) return;
  await signout();
  await send('you have been signed out!');
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

```ts
app.message('/signout', async (ctx) => {
  await graph.signOut(ctx);
  await ctx.send('you have been signed out!');
});
```

  </TabItem>
</Tabs>

<!-- multiple-connections -->

```ts
const app = new App();

const graph = app.addOAuthFlow('graph', { oauthCardText: 'Sign in with Microsoft' });
const github = app.addOAuthFlow('github', { oauthCardText: 'Sign in with GitHub' });

app.message('/graph', async (ctx) => {
  const token = await graph.signIn(ctx);
  if (token) await sendGraphProfile(ctx, token);
});

app.message('/github', async (ctx) => {
  const token = await github.signIn(ctx);
  if (token) await sendGitHubProfile(ctx, token);
});

graph.onSignInComplete(async (ctx, token) => sendGraphProfile(ctx, token.token));
github.onSignInComplete(async (ctx, token) => sendGitHubProfile(ctx, token.token));

app.message('/signout github', async (ctx) => {
  await github.signOut(ctx);
  await ctx.send('Signed out of GitHub.');
});
```

Signing out of one connection leaves the other signed in.

<!-- connection-status -->

```ts
app.message('/status', async (ctx) => {
  const statuses = await ctx.getConnectionStatus();
  const lines = statuses.map(
    (status) => `- \`${status.connectionName}\`: ${status.hasToken ? 'signed in' : 'signed out'}`
  );
  await ctx.send(lines.join('\n'));
});
```

<!-- pending-messages -->

<Tabs groupId="typescript-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```ts
const pendingMessages = new Map<string, { text: string; activity: any }>();

app.on('message', async ({ signin, activity, send }) => {
  // signin() returns the token if already signed in, or undefined if OAuth card was sent
  const token = await signin({
    oauthCardText: 'To help with that, I need to sign you in first.',
  });

  if (!token) {
    // OAuth card sent — store the original message for later
    pendingMessages.set(activity.from.id, {
      text: activity.text,
      activity,
    });
    return;
  }

  // User is already signed in — process normally
  await processMessage(activity.text, { send });
});

app.event('signin', async ({ send, userGraph, activity }) => {
  const userId = activity.from.id;
  const pending = pendingMessages.get(userId);

  if (pending) {
    pendingMessages.delete(userId);
    await send('Successfully signed in! Processing your original request...');
    await processMessage(pending.text, { send, userGraph });
  } else {
    await send('You are now signed in!');
  }
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

```ts
const pendingMessages = new Map<string, string>();

app.on('message', async (ctx) => {
  // signIn() returns the token if already signed in, or undefined if an OAuth card was sent
  const token = await graph.signIn(ctx, {
    oauthCardText: 'To help with that, I need to sign you in first.',
  });

  if (!token) {
    pendingMessages.set(ctx.activity.from.id, ctx.activity.text);
    return;
  }

  await processMessage(ctx.activity.text, ctx, token);
});

graph.onSignInComplete(async (ctx, token) => {
  const userId = ctx.activity.from.id;
  const pending = pendingMessages.get(userId);

  if (!pending) {
    await ctx.send('You are now signed in!');
    return;
  }

  pendingMessages.delete(userId);
  await ctx.send('Successfully signed in! Processing your original request...');
  await processMessage(pending, ctx, token.token);
});
```

  </TabItem>
</Tabs>

<!-- signin-failure -->

<Tabs groupId="typescript-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```ts
app.on('signin.failure', async ({ activity, send }) => {
  const { code, message } = activity.value;
  console.log(`Sign-in failed: ${code} - ${message}`);
  await send('Sign-in failed.');
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

```ts
graph.onSignInFailure(async (ctx, failure) => {
  ctx.log.error(`Graph sign-in failed: ${failure?.code} - ${failure?.message}`);
  await ctx.send('Graph sign-in failed.');
});
```

`failure` is undefined for token-service and token-exchange failures, which carry no Teams payload.

  </TabItem>
</Tabs>

<!-- regional-bot -->

## Regional Configs
You may be building a regional bot that is deployed in a specific Azure region (such as West Europe, East US, etc.) rather than global. This is important for organizations that have data residency requirements or want to reduce latency by keeping data and authentication flows within a specific area.

These examples use West Europe, but follow the equivalent for other regions.

<Tabs>
<TabItem value="portal" label="Azure Portal">
To configure a new regional bot in Azure, you must setup your resoures in the desired region. Your resource group must also be in the same region. 

1. Deploy a new App Registration in `westeurope`.
2. Deploy and link a new Enterprise Application (Service Principal) on Microsoft Entra in `westeurope`.
3. Deploy and link a new Azure Bot in `westeurope`.
4. In your App Registration, in the `Authentication (Preview)` tab, add a `Redirect URI` for the Platform Type `Web` to your regional endpoint (e.g., `https://europe.token.botframework.com/.auth/web/redirect`)

![Authentication Tab](/screenshots/regional-auth.png)

5. In your `.env` file (or wherever you set your environment variables), add your `OAUTH_URL`. For example:
`OAUTH_URL=https://europe.token.botframework.com`
</TabItem>

<TabItem value="atk" label="Agents Toolkit">
To configure a new regional bot with ATK, you will need to make a few updates. Note that this assumes you have not yet deployed the bot previously.

1. In `azurebot.bicep`, replace all `global` occurrences to `westeurope`
2. In `manifest.json`, in `validDomains`, `*.botframework.com` should be replaced by `europe.token.botframework.com`
3. In `aad.manifest.json`, replace `https://token.botframework.com/.auth/web/redirect` with `https://europe.token.botframework.com/.auth/web/redirect`
4. In your `.env` file, add your `OAUTH_URL`. For example:
`OAUTH_URL=https://europe.token.botframework.com`
</TabItem>
</Tabs>