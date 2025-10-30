---
sidebar_position: 1
summary: Test chat functionality with your Teams agent using the lightweight DevTools without sideloading into Teams.
llms: ignore
---

# 💬 Devtools chat

Use the lightweight DevTools app that allows you to test chat functionality with your agent without the need to sideload into Teams. This is useful for testing and debugging.

![Empty DevTools chat](https://github.com/microsoft/teams.ts/blob/main/assets/screenshots/devtools_blank_chat.png?raw=true)

:::note
We plan to add more features to DevTools for a wider variety of testing. Stay tuned!
:::

## Using DevTools

Use the Teams SDK dev package as a plugin.

### Installation

Add the dev package to your Teams app.

```bash
$: npm install @microsoft/teams.dev
```

### Usage

In your app's main file, ensure DevTools plugin is added to the app.

:::warning
DevTools is not secure and should not be used in production environments. Remove the plugin before deploying your app to production.
:::

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common/logging';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
//... Other imports here
const app = new App({
  logger: new ConsoleLogger('@samples/echo', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});
```

When you run your app, for example `npm run dev`, devtools will be running on port 3979

```bash
[nodemon] watching extensions: ts
[nodemon] starting `node -r ts-node/register -r dotenv/config ./src/index.ts`
[INFO] @samples/echo/http listening on port 3978 🚀
[INFO] @samples/echo/devtools available at http://localhost:3979/devtools
```

:::info
If you used the [CLI](../cli) to create an `atk` configuration for your app, DevTools will run on port 3979 when you launch the debugger.
:::

When you open the page, you will see a Teams-like chat window and you can immediately interact with your agent.

![Screenshot of DevTools showing user prompt 'hello!' and agent response 'you said hello!'.](/screenshots/devtools-echo-chat.png)

## Teams chat terminology

Below is a brief list of the terminology used in the chat window and in Teams:

1. **Compose box**: The area where you type your message and attach files. A newly rendered Chat page will automatically focus on the compose box.
2. **Message actions menu**: The menu that appears when you hover over or focus on a message, offering different actions depending on whether you sent or received the message.

## Chat capabilities

The chat window emulates Teams features as closely as possible. Not all Teams features are available in DevTools, but we are working to add more features over time. The following capabilities are available:

:::info
Accessibility and keyboard navigation is not fully supported in DevTools. Full support for all users is important to us, and we will prioritize acessibility in future preview releases.
:::

### Send messages

You can send messages to your agent just like in Teams. In the compose box, type your message and press <kbd>Enter</kbd> to send it.

### Attachments

Attach up to 10 files to your message using the Attach (paperclip) button. DevTools supports pasting an Adaptive Card JSON or attaching a card from the card designer. See the [Cards page](./cards) for more.

:::note
Further support for attachments is coming soon!
:::

### Connectivity

Check your app's connectivity in three ways:

1. The DevTools banner shows a green badge or 'Connected' text when connected, and red or 'Disconnected' when not.
2. Similarly, the agent's avatar shows a 'Connected' or 'Disconnected' badge.
3. DevTools uses the `ConsoleLogger` that logs connectivity events to the console. Use the browser's console tool to see the logs.

### Message reactions

You can react to messages by selecting an emoji in the message actions menu.

![Devtools react to a message](https://github.com/microsoft/teams.ts/blob/main/assets/screenshots/devtools_message_reaction.gif?raw=true)

### Edit your message

Edit messages by selecting the Edit (pencil) icon from the message actions menu. Press Enter or the checkmark button to send the edited message, or the Dismiss (X) button to cancel.

### Delete your message

Soft delete messages by hovering over your message, pressing the More (ellipsis) button, then the Delete (trash) button. Click "Undo" to restore the message.

### Streaming

If your agent is using streaming, DevTools will render messages as a stream with a rainbow border until the stream ends. See the full stream on the [Activities](inspect) page by clicking the Inspect (magnifying glass) button in the message actions menu of the message.

### Feedback

Send feedback to your app by clicking the Feedback (thumbs up/down) buttons in the message actions menu and completing the dialog form.

:::info
The capabilities above will also populate activities to the Activities page, where you can inspect activity payloads and see the full activity history.
:::

### Developer message shortcut

For easier debugging, the compose box stores the last five messages sent to the app. Press the Up <kbd>↑</kbd> arrow key to cycle through your message history and resend messages.

![Devtools Up Arrow Feature](https://github.com/microsoft/teams.ts/blob/main/assets/screenshots/devtools_uparrow_feature.gif?raw=true)
