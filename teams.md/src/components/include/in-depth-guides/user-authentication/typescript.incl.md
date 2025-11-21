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

To properly configure your regional bot, you will need to make a few updates. This example uses West Europe, but follow the equivalent for other regions.

1. In `azurebot.bicep`, replace all `global` occurrences to `westeurope`
2. In `manifest.json`, in `validDomains`, `*.botframework.com` should be replaced by `europe.token.botframework.com`
3. In `aad.manifest.json`, replace `https://token.botframework.com/.auth/web/redirect` with `https://europe.token.botframework.com/.auth/web/redirect`
4. You will also need to update the setup of your App instance to add in your Oauth URL.

```ts
const app = new App({
  oauth: {
    defaultConnectionName: 'graph'
  },
  apiClientSettings: {
      oauthUrl: 'https://europe.token.botframework.com',
    }
});
```