---
sidebar_position: 4
title: 'Microsoft Graph'
summary: Access Microsoft Graph APIs with type-safe client and manage user consent for permissions.
languages: ['typescript']
suppressLanguageIncludeWarning: true
---

# Microsoft Graph Client

The client App exposes a `graph` property that gives type-safe access to Microsoft Graph functions. When graph functions are invoked, the app attaches an MSAL bearer token to the request so that the call can be authenticated and authorized.

## Invoking Graph functions

After constructing and starting an App instance, you can invoke any graph function by using the `app.graph` client.

```typescript
import { App } from '@microsoft/teams.client';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App(clientId);
await app.start();

const top10Chats = await app.graph.call(endpoints.chats.list, { $top: 10 });
```

For best result, it's wise to ensure that the user has consented to a permission required by the graph API before attempting to invoke it. Otherwise, the call is likely to be rejected by the graph server.

## Graph APIs and permissions

Different graph APIs have different permission requirements. The app developer should make sure that consent is granted before invoking a graph API. To help request and test for consent, the client App offers three methods:

- Pre-warming while starting the app.
- Requesting consent if not already granted.
- Testing for consent without prompting.

### Pre-warming while starting the app

The App constructor takes an option that lets you control how scope consent is requested while starting the app. For more details on this option, see the [App options](./app-options) documentation.

### Requesting consent if not already granted

The app provides an `ensureConsentForScopes` method that tests if the user has consented to a certain set of scopes and prompts them if consent isn't yet granted.

The method returns a promise that resolves to true if the user has already provided consent to all listed scopes; and to false if the user declines the prompt.

This method is useful for building an incremental, just-in-time, consent model, or to fully control how consent is pre-warmed.

```typescript
import { App } from '@microsoft/teams.client';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App(clientId, {
  msalOptions: { prewarmScopes: ['User.Read'] },
});

// this will prompt for the User.Read scope if not already granted
await app.start();

// this will prompt for Chat.ReadBasic if not already granted
const canReadChat = await app.ensureConsentForScopes(['Chat.ReadBasic']);

if (canReadChat) {
  const top10Chats = await app.graph.call(endpoints.chats.list, { $top: 10 });
  // ... do something useful ...
}
```

#### Testing for consent without prompting

The app also provides a `hasConsentForScopes` method to test for consent without raising a prompt. This is handy to enable or disable features based on user choice, or to provide friendly messaging before raising a prompt with `ensureConsentForScopes`.

```typescript
import { App } from '@microsoft/teams.client';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App(clientId);

// this will prompt for the '.default' scope if the user hasn't already
// consented to any scope
await app.start();

// this will not raise a prompt under any circumstance
const canReadChat = await app.hasConsentForScopes(['Chat.ReadBasic']);

if (canReadChat) {
  const top10Chats = await app.graph.call(endpoints.chats.list, { $top: 10 });
  // ... do something useful ...
}
```

## References

- [Graph API overview](https://learn.microsoft.com/en-us/graph/api/overview)
- [Graph API permissions overview](https://learn.microsoft.com/en-us/graph/permissions-reference)
