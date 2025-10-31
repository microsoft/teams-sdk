---
sidebar_position: 3
title: 'App Options'
summary: Configure app settings for observability, MSAL authentication, and remote agent function calling.
languages: ['typescript']
suppressLanguageIncludeWarning: true
---

# App Options

The app options offer various settings that you can use to customize observability, Microsoft Authentication Library (MSAL) configuration, and
remote agent function calling. Each setting is optional, with the app using a reasonable default as needed.

## Logger

If no logger is specified in the app options, the app will create a [ConsoleLogger](../observability/logging). You can however provide your own logger implementation to control log level and destination.

```typescript
import { App } from '@microsoft/teams.client';
import { ConsoleLogger } from '@microsoft/teams.common';

const app = new App(clientId, {
  logger: new ConsoleLogger('myTabApp', { level: 'debug' }),
});

await app.start();
```

## Remote API options

The remote API options let you control which endpoint that `app.exec()` make a request to, as well as the default resource name to use when requesting an MSAL token to attach to the request.

### Base URL

The `baseUrl` value is used to provide the URL where the remote API is hosted. This can be omitted if the tab app is hosted on the same domain as the remote agent.

```typescript
import { App } from '@microsoft/teams.client';

const app = new App(clientId, {
  remoteApiOptions: {
    baseUrl: 'https://agent1.contoso.com',
  },
});
await app.start();

// this requests a token for 'api://<clientId>/access_as_user' and attaches
// that to a request to https://agent1.contoso.com/api/functions/my-function
await app.exec('my-function');
```

### Remote app resource

The `remoteAppResource` value is used to control the default resource name used when building a token request for the Entra token to include when invoking the function. This can be omitted if the tab app and the remote agent app are in the same AAD app, but should be provided if they're in different apps or the agent requires scopes for a different resource than the default `api://<clientId>/access_as_user`.

```typescript
import { App } from '@microsoft/teams.client';

const app = new App(clientId, {
  remoteApiOptions: {
    baseUrl: 'https://agent1.contoso.com',
    remoteAppResource: 'api://agent1ClientId',
  },
});
await app.start();

// this requests a token for 'api://agent1ClientId/access_as_user' and attaches that
// to a request to https://agent1.contoso.com/api/functions/my-function
await app.exec('my-function');
```

## MSAL options

The MSAL options let you control how the Microsoft Authentication Library (MSAL) is initialized and used, and how the user is prompted for scope consent as the app starts.

### MSAL instance and configuration

You have three options to control the MSAL instance used by the app.

- Provide a pre-configured and pre-initialized MSAL IPublicClientApplication.
- Provide a custom MSAL configuration for the app to use when creating an MSAL IPublicClientApplication instance.
- Provide neither, and let the app create IPublicClientApplication from a default MSAL configuration.

#### Default behavior

If the app options contain neither an MSAL instance nor an MSAL configuration, the app constructs a simple MSAL configuration that is suitable for multi-tenant apps and that connects the MSAL logger callbacks to the app logger.

```typescript
import { App } from '@microsoft/teams.client';

const app = new App(clientId);

await app.start();
// app.msalInstance is now available, and any logging is forwarded from
// MSAL to the app.log instance.
```

#### Providing a custom MSAL configuration

MSAL offers a rich set of configuration options, and you can provide your own configuration as an app option.

```typescript
import * as msal from '@azure/msal-browser';
import { App } from '@microsoft/teams.client';

const configuration: msal.Configuration = {
  /* custom MSAL configuration options */
};

const app = new App(clientId, { msalOptions: { configuration } });

await app.start();
```

#### Providing a pre-configured MSAL IPublicClientApplication

MSAL cautions against an app using multiple IPublicClientApp instances at the same time. If you're already using MSAL, you can provide a pre-created MSAL instance to use as an app option.

```typescript
import * as msal from '@azure/msal-browser';
import { App } from '@microsoft/teams.client';

const msalInstance =
  await msal.createNestablePublicClientApplication(/* custom MSAL configuration */);
await msalInstance.initialize();

const app = new App(clientId, { msalOptions: { msalInstance } });

await app.start();
```

If you need multiple app instances in order to call functions in several agents, you can re-use the MSAL instance from one as you construct another.

```typescript
import { App } from '@microsoft/teams.client';

// let app1 create & initialize an MSAL IPublicClientApplication
const app1 = new App(clientId, {
  remoteApiOptions: {
    baseUrl: 'https://agent1.contoso.com',
    remoteAppResource: 'api://agent1AppClientId',
  },
});
await app1.start();

// let app2 re-use the MSAL IPublicClientApplication from app1
const app2 = new App(clientId, {
  remoteApiOptions: {
    baseUrl: 'https://agent2.contoso.com',
    remoteAppResource: 'api://agent2AppClientId',
  },
  msalOptions: { msalInstance: app1.msalInstance },
});
```

### Scope consent pre-warming

The MSAL options let you control whether and how the user is prompted to give the app permission for any necessary scope as the app starts. This option can be used to reduce the number of consent prompts the user sees while using the app, and to help make sure the app gets consent for the resource it needs to function.

With this option, you can either pre-warm a specific set of scopes or disable pre-warming altogether. If no setting is provided, the default behavior is to prompt the user for the Graph scopes listed in the app manifest, unless they've already consented to at least on Graph scope.

For more details on how and when to prompt for scope consent, see the [Graph](./graph) documentation.

#### Default behavior

If the app is started without specifying any option to control scope pre-warming, the `.default` scope is pre-warmed. This means that in a first-run experience, the user would be prompted to consent for all Graph permissions listed in the app manifest. However, if the user has consented to at least one Graph permission, any one at all, no prompt appears.

```typescript
import { App } from '@microsoft/teams.client';

const app = new App(clientId);

// if the user hasn't already given consent for any scope at
// all, this will prompt them
await app.start();
```

:::info
The user can decline the prompt and the app will still continue to run. However, the user will again be prompted next time they launch the app.
:::

#### Pre-warm a specific set of scopes

If your app requires a specific set of scopes in order to run well, you can list those in the set of scopes to pre-warm.

```typescript
import { App } from '@microsoft/teams.client';

const app = new App(clientId, {
  msalOptions: { prewarmScopes: ['User.Read', 'Chat.ReadBasic'] },
});

// if the user hasn't already given consent for each listed scope,
// this will prompt them
await app.start();
```

:::info
The user can decline the prompt and the app will still continue to run. However, the user will again be prompted next time they launch the app.
:::

#### Disabling pre-warming

Scope pre-warming can be disabled if needed. This is useful if your app doesn't use graph APIs, or if you want more control over the consent prompt.

```typescript
import { App } from '@microsoft/teams.client';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App(clientId, {
  msalOptions: { prewarmScopes: false },
});

// this will not raise any consent prompt
await app.start();

// this will prompt for the '.default' scope if the user hasn't already
// consented to any scope
const top10Chats = await app.graph.call(endpoints.chats.list, { $top: 10 });
```

:::info
Even if pre-warming is disabled and the user is not prompted to consent, a prompt for the `.default` scope will appear when invoking any graph API.
:::

## References

[MSAL Configuration](https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-application-configuration)
