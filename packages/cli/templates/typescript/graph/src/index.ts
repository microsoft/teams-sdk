import { MessageActivity } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
import { AdaptiveCard, CodeBlock } from '@microsoft/teams.cards';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App({
  oauth: {
    defaultConnectionName: 'graph'
  },
});

app.message('/signout', async ({ send, signout, isSignedIn }) => {
  if (!isSignedIn) return;
  await signout(); // call signout for your auth connection...
  await send('you have been signed out!');
});


app.on('message', async ({ log, signin, isSignedIn }) => {
  if (!isSignedIn) {
    await signin();
    return;
  }

  log.info('user already signed in!');
});

app.event('signin', async ({ send, userGraph }) => {
  const me = await userGraph.call(endpoints.me.get);

  await send(
    new MessageActivity(`hello ${me.displayName} 👋!`).addCard(
      'adaptive',
      new AdaptiveCard(
        new CodeBlock({
          codeSnippet: JSON.stringify(me, null, 2),
        })
      )
    )
  );
});

app.on('signin.failure', async ({ activity, log, send }) => {
  const { code, message } = activity.value;
  log.error(`sign-in failed: ${code} - ${message}`);
  await send('Sign-in failed.');
});

app.start(process.env.PORT || 3978).catch(console.error);
