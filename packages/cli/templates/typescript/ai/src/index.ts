import { App } from '@microsoft/teams.apps';
import { ChatPrompt, Message } from '@microsoft/teams.ai';
import { LocalStorage } from '@microsoft/teams.common/storage';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import { OpenAIChatModel } from '@microsoft/teams.openai';

const storage = new LocalStorage<Array<Message>>();
const app = new App({
  storage,
  plugins: [new DevtoolsPlugin()],
});

app.on('message', async ({ stream, activity }) => {
  const prompt = new ChatPrompt({
    messages: storage.get(`${activity.conversation.id}/${activity.from.id}`),
    model: new OpenAIChatModel({
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
    }),
  });

  await prompt.send(activity.text, {
    onChunk: (chunk) => stream.emit(chunk),
  });
});

app.start(process.env.PORT || 3978).catch(console.error);
