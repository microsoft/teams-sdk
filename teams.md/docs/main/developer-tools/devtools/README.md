---
sidebar_position: 2
summary: Use DevTools to locally test Teams apps with chat, activity inspection, and card design features.
llms: ignore
---

# 🛠️ DevTools

The developer tools can be used to locally interact with an app to streamline the testing/development process,
preventing you from needing to deploy/register the app or expose a public endpoint.

![Screenshot of DevTools showing user prompt 'hello!' and agent response 'you said hello!'.](/screenshots/devtools-echo-chat.png)

## Basic features

- **Chat**: Chat with your app the same way you would in Teams without the need for an app id or authentication. This is useful for testing and debugging your app.
- **Inspect**: Inspect incoming and outgoing activities on DevTools' Activity page. All activity on your agent logged here, including messages, reactions, and more.
- **Cards**: Use the Cards page to visually design and test your cards.

Continue on to the next pages to learn more about the features available in DevTools.

## Production environments

:::warning
DevTools is designed for local development only. It will **not start** in production environments. The following environment checks are enforced:

- **TypeScript**: `NODE_ENV=production`
- **Python**: `PYTHON_ENV=production` or `NODE_ENV=production`
- **C#**: `ASPNETCORE_ENVIRONMENT=Production` (via `IHostEnvironment.IsProduction()`)

If your app fails to start with an error about DevTools in production, remove the DevTools plugin from your app configuration.
:::
