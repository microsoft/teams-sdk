<!-- create-project -->

Use your terminal to run the following command:

```sh
npx @microsoft/teams.cli@latest new typescript oauth-app --template graph
```

This command:

1. Creates a new directory called `oauth-app`.
2. Bootstraps the graph agent template files into it under `oauth-app/src`.
3. Creates your agent's manifest files, including a `manifest.json` file and placeholder icons in the `oauth-app/appPackage` directory.

<!-- configure-oauth -->

```ts
import { App } from '@microsoft/teams.apps';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App({
  oauth: {
    defaultConnectionName: 'graph',
  },
});
```

<!-- signing-in -->

```ts
app.message('/signin', async ({ send, signin, isSignedIn }) => {
  if (isSignedIn) {
    send('you are already signed in!');
  } else {
    await signin();
  }
});
```

<!-- signin-event -->

```ts
app.event('signin', async ({ send, token }) => {
  await send(
    `Signed in using OAuth connection ${token.connectionName}. Please type **/whoami** to see your profile or **/signout** to sign out.`
  );
});
```

<!-- using-graph -->

```ts
import * as endpoints from '@microsoft/teams.graph-endpoints';

app.message('/whoami', async ({ send, userGraph, isSignedIn }) => {
  if (!isSignedIn) {
    await send('you are not signed in! please type **/signin** to sign in.');
    return;
  }
  const me = await userGraph.call(endpoints.me.get);
  await send(
    `you are signed in as "${me.displayName}" and your email is "${me.mail || me.userPrincipalName}"`
  );
});

app.on('message', async ({ send, activity, isSignedIn }) => {
  if (isSignedIn) {
    await send(
      `You said: "${activity.text}". Please type **/whoami** to see your profile or **/signout** to sign out.`
    );
  } else {
    await send(`You said: "${activity.text}". Please type **/signin** to sign in.`);
  }
});
```

<!-- signing-out -->

```ts
app.message('/signout', async ({ send, signout, isSignedIn }) => {
  if (!isSignedIn) {
    await send('you are not signed in! please type **/signin** to sign in.');
    return;
  }
  await signout(); // call signout for your auth connection...
  await send('you have been signed out!');
});
```

<!-- regional-bot -->
## Regional Configs
You may be building a regional bot that is deployed in a specific Azure region (such as West Europe, East US, etc.) rather than global. This is important for organizations that have data residency requirements or want to reduce latency by keeping data and authentication flows within a specific area.

These examples use West Europe, but follow the equivalent for other regions.

To configure a new regional bot in Azure, you must setup your resoures in the desired region. Your resource group must also be in the same region. 

1. Deploy a new App Registration in `westeurope`.
2. Deploy and link a new Enterprise Application (Service Principal) on Microsoft Entra in `westeurope`.
3. In your App Registration, add a `Redirect URI` for the Platform Type `Web` to your regional endpoint (e.g., `https://europe.token.botframework.com/.auth/web/redirect`)
4. In your `.env` file (or wherever you set your environment variables), add your `OAUTH_URL`. For example:
`OAUTH_URL=https://europe.token.botframework.com`


To configure a new regional bot with ATK, you will need to make a few updates. Note that this assumes you have not yet deployed the bot previously.

1. In `azurebot.bicep`, replace all `global` occurrences to `westeurope`
2. In `manifest.json`, in `validDomains`, `*.botframework.com` should be replaced by `europe.token.botframework.com`
3. In `aad.manifest.json`, replace `https://token.botframework.com/.auth/web/redirect` with `https://europe.token.botframework.com/.auth/web/redirect`
4. In your `.env` file, add your `OAUTH_URL`. For example:
`OAUTH_URL=https://europe.token.botframework.com`
