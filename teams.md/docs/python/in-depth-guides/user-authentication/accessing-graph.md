---
sidebar_position: 1
summary: Create a Teams app with Microsoft Graph authentication using the Agents Toolkit and SSO flow.
---

# Accessing Microsoft Graph

In this section we will walk through creating an app that can access the [Microsoft Graph APIs](https://learn.microsoft.com/en-us/graph/overview) on behalf of the user by authenticating them with the [Microsoft Entra ID](https://www.microsoft.com/en-us/security/business/identity-access/microsoft-entra-id) oauth provider. 

:::info
It is possible to authenticate the user into [other auth providers](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-identity-providers?view=azure-bot-service-4.0&tabs=adv2%2Cga2#other-identity-providers) like Facebook, Github, Google, Dropbox, and so on.
:::

:::info
This is an advanced guide. It is highly recommended that you are familiar with [creating an app](../../getting-started/quickstart) and [running it in Teams](../../getting-started/running-in-teams) before attempting to follow this guide.
:::

:::warning
User authentication does not work with the developer tools setup. You have to run the app in Teams. Follow these [instructions](../../getting-started/running-in-teams#debugging-in-teams) to run your app in Teams.
:::

## Setup Instruction

### Create an app with the `graph` template

:::tip
Skip this step if you want to add the auth configurations to an existing app.
:::

:::note
In this template, `graph` is the default name of the OAuth connection, but you can change that by supplying `defaultOauthConnectionName` in the `app`.
:::

Use your terminal to run the following command: 


```sh
npx @microsoft/teams.cli@latest new python oauth-app --template graph
```


This command:
1. Creates a new directory called `oauth-app`.
2. Bootstraps the graph agent template files into it under `oauth-app/src`.
3. Creates your agent's manifest files, including a `manifest.json` file and placeholder icons in the `oauth-app/appPackage` directory. The Teams [app manifest](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema) is required for [sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) the app into Teams.

### Add Agents Toolkit auth configuration

Open your terminal with the `oauth-app/` folder set as the current working directory and run the following command:


```sh
npx @microsoft/teams.cli config add atk.oauth
```


This will add relevant Agents Toolkit files to your project.

:::tip
See [App Setup](./setup#using-microsoft-365-agents-toolkit-with-the-teams-cli) to learn more about what this command does.
:::

## Interacting with the app in Teams

Once you have successfully sideloaded the app into Teams you can now interact with it and sign the user in. 

### Signing the user in

:::note
This is the Single Sign-On (SSO) authentication flow. To learn more about all the available flows and their differences see the [How Auth Works](auth-sso) guide.
:::

When the user sends a message to the user a consent form will popup:

![Consent popup](/screenshots/auth-consent-popup.png)

This will ask the user to consent to the `User.ReadBasic.All` Microsoft Graph scope:

:::note
The `atk.oauth` configuration explicitly requests the `User.ReadBasic.All` permission. It is possible to request other permissions by modifying the App Registration for the bot on Azure.
:::

![Entra ID signin](/screenshots/auth-entra-id-signin.png)

Once the user signs in and grants the app access, they will be redirected back to the Teams client and the app will send back the user's information as retrieved from the graph client:

![Graph message](/screenshots/auth-graph-message.png)

The user can then signout by sending the `signout` command to the app:

![Signout message](/screenshots/auth-signout-message.png)
