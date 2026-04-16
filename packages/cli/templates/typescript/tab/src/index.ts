import path from 'path';

import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common/logging';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  logger: new ConsoleLogger('@tests/tab', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

app.tab('test', path.resolve('dist/client'));

app.function<{}, { message: string }>(
  'post-to-chat',
  async ({ data, send, getCurrentConversationId }) => {
    // post to the current conversation; return the conversation ID to the caller
    await send(data.message);
    return {
      conversationId: await getCurrentConversationId(),
    };
  },
);

app.on('message', async ({ activity, reply }) => {
  // simple echo bot
  reply(`You said: ${activity.text}`);
});

app.start(process.env.PORT || 3978).catch(console.error);
