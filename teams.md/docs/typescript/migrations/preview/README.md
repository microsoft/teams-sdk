---
sidebar_position: 3
---

# From V2 Previews

If you're moving from preview versions of Teams SDK, you may encounter a few breaking changes along the way. This page outlines those and shows how to get back on track.

## Graph Client

The Graph Client has been redesigned to be more flexible and support far more Graph APIs, while being mindful of code and package size. The Graph endpoints are now an optional dependency, and one that is fully tree-shakable if you're using a modern bundler. 

The redesign changes the calling pattern slightly. If you were using Graph APIs, you may need to update your code.

### Installing endpoints dependency
The first step in the migration is to install the `@microsoft/teams.graph-endpoints` dependency. This dependency is optional to reduce overhead for for applications that don't need to call Graph APIs. If you're reading this migration guide however, you'll likely want to install it.

This package is installed just like any other NPM package, using your package manager of choice. For instance:

```sh
npm install @microsoft/teams.graph-endpoints
```

### Updating code
Once the endpoints dependency is installed, the code changes should be fairly straight forward as the overall Graph taxonomy and API naming conventions have not changed. The overall change is that instead of invoking an endpoint function directly, you now pass in an endpoint to the `graphClient.call()` method.

#### Calling endpoints
In earlier preview versions, the way to get details for the current user was:

```typescript
// GET /me
const me = await app.graph.me.get();
```

In current versions, the equivalent method is:
```typescript
import * as endpoints from '@microsoft/teams.graph-endpoints';

// GET /me
const me = await app.graph.call(endpoints.me.get);
```

#### Providing arguments
In earlier preview versions, variables were passes as an argument when invoking the endpoint. To get details for a specific user, you would do the following:

```typescript
// GET /users/{id | userPrincipalName}
const user = await app.graph.users.get({ 'user-id': userId });
```

In current versions, the variables are provided as a separate argument after the endpoint:
```typescript
import * as endpoints from '@microsoft/teams.graph-endpoints';

// GET /users/{id | userPrincipalName}
const user = await app.graph.call(endpoints.users.get, { 'user-id': userId });
```

#### No more redundant arguments
In earlier preview versions, some endpoints required the same argument to be provided twice. For instance:

```typescript
// GET /teams/{team-id}/installedApps`
const apps = await app.graph.teams.installedApps(teamId).list({ 'team-id': teamId });
```

In current versions, once is enough:

```typescript
// GET /teams/{team-id}/installedApps`
const apps = await app.graph.call(endpoints.teams.installedApps.list, { "team-id": teamId });
```

#### Improving readability
If you find it helpful for readability, you can scope your endpoint import as you prefer. For instance:

```typescript
import * as endpoints from '@microsoft/teams.graph-endpoints';
import { me } from '@microsoft/teams.graph-endpoints';
import { presence } from '@microsoft/teams.graph-endpoints/me';
import { setPresence } from '@microsoft/teams.graph-endpoints/me/presence';
import { create as updatePresence  } from '@microsoft/teams.graph-endpoints/me/presence/setPresence';

// different ways to POST to /me/presence/setPresence
const newPresence = { availability: 'Away', activity: 'Away', sessionId: clientId };
await app.graph.call(endpoints.me.presence.setPresence.create, newPresence);
await app.graph.call(me.presence.setPresence.create, newPresence);
await app.graph.call(presence.setPresence.create, newPresence);
await app.graph.call(setPresence.create, newPresence);
await app.graph.call(updatePresence, newPresence);
```

