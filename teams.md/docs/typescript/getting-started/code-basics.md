---
sidebar_position: 2
summary: Understanding the structure and key components of a Teams SDK application including the App class, plugins, and project organization.
---

# Code Basics

After following the guidance in [the quickstart](quickstart) to create your first Teams application, let's review its structure and key components. This knowledge can help you build more complex applications as you progress.

## Project Structure

When you create a new Teams application, it generates a directory with this basic structure:


```
quote-agent/
|── appPackage/       # Teams app package files
├── src/
│   └── index.ts      # Main application code
```

- **appPackage/**: Contains the Teams app package files, including the `manifest.json` file and icons. This is required for [sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) the app into Teams for testing. The app manifest defines the app's metadata, capabilities, and permissions.
- **src/**: Contains the main application code. The `index.ts` file is the entry point for your application.

## Core Components

Let's break down the simple application from the [quickstart](quickstart) into its core components.

### The App Class

The heart of an application is the `App` class. This class handles all incoming activities and manages the application's lifecycle. It also acts as a way to host your application service.


```typescript title="src/index.ts"
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common/logging';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  plugins: [new DevtoolsPlugin()],
});
```


The app configuration includes a variety of options that allow you to customize its behavior, including controlling the underlying server, authentication, and other settings.

### Plugins

Plugins are a core part of the Teams AI v2 SDK. They allow you to hook into various lifecycles of the application. The lifecycles include server events (start, stop, initialize, etc.), and also Teams Activity events (onActivity, onActivitySent, etc.). In fact, the [DevTools](/developer-tools/devtools) application you already have running is a plugin too. It allows you to inspect and debug your application in real-time.

:::warning
DevTools is a plugin that should only be used in development mode. It should not be used in production applications since it offers no authentication and allows your application to be accessed by anyone.
**Be sure to remove the DevTools plugin from your production code.**
:::

### Message Handling

Teams applications respond to various types of activities. The most basic is handling messages:


```typescript title="src/index.ts"
app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });
  await send(`you said "${activity.text}"`);
});
```


This code:

1. Listens for all incoming messages using `app.on('message')`.
2. Sends a typing indicator, which renders as an animated ellipsis (…) in the chat.
3. Responds by echoing back the received message.

:::info
Type safety is a core tenet of this version of the SDK. You can change the activity `name` to a different supported value, and the type system will automatically adjust the type of activity to match the new value.
:::

### Application Lifecycle

Your application starts when you run:


```typescript title="src/index.ts"
(async () => {
  await app.start();
})();
```


This code initializes your application server and, when configured for Teams, also authenticates it to be ready for sending and receiving messages.

## Next Steps

Now that you understand the basic structure of your Teams application, you're ready to [run it in Teams](running-in-teams). You will learn about Microsoft 365 Agents Toolkit and other important tools that help you with deployment and testing your application.

After that, you can:

- Add more activity handlers for different types of interactions. See [Listening to Activities](../essentials/on-activity) for more details.
- Integrate with external services using the [API Client](../essentials/api).
- Add interactive [cards](../in-depth-guides/adaptive-cards) and [dialogs](../in-depth-guides/dialogs).
- Implement [AI](../in-depth-guides/ai).

Continue on to the next page to learn about these advanced features.

## Other Resources

- [Essentials](../essentials)
- [Teams concepts](/teams)
- [Teams developer tools](/developer-tools)
