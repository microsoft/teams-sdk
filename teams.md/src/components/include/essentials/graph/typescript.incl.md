<!-- package-info -->

`@microsoft/teams.graph`, `@microsoft/teams.graph-endpoints` and `@microsoft/teams.graph-endpoints-beta` packages

<!-- migration-note -->

:::note
If you're migrating from an earlier preview version of the Teams SDK library, please see the [migration guide](../migrations/v2-previews) for details on breaking changes.
:::

<!-- package-overview -->

## Package overview

The Graph API surface is vast, and this is reflected in the size of the endpoints packages. To help you manage the size of your product, we made sure that the endpoints code is tree-shakable. We also made most of the code into an optional dependency, in case tree-shaking is not supported in your environment.

| Package                                 | Optional | Contains                                                                            |
| --------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `@microsoft/teams.graph`                | No       | A tiny client to create and issue Graph HTTP requests.                              |
| `@microsoft/teams.graph-endpoints`      | Yes      | Request-builder functions and types to call any of the production ready Graph APIs. |
| `@microsoft/teams.graph-endpoints-beta` | Yes      | Same, but for Graph APIs still in preview.                                          |

To use this library to call Graph APIs, the first step is to install the optional endpoints package using your favorite package manager. For instance:

```sh
npm install @microsoft/teams.graph-endpoints
```

<!-- app-graph-object -->

`app.graph`

<!-- app-access-method -->

to call the endpoint of your choice

<!-- app-graph-example -->

```typescript
import * as endpoints from '@microsoft/teams.graph-endpoints';

// Equivalent of https://learn.microsoft.com/en-us/graph/api/user-get
// Gets the details of the bot-user
app.graph.call(endpoints.me.get).then((user) => {
  console.log(`User ID: ${user.id}`);
  console.log(`User Display Name: ${user.displayName}`);
  console.log(`User Email: ${user.mail}`);
  console.log(`User Job Title: ${user.jobTitle}`);
});
```

<!-- user-graph-intro -->

You can also access the graph using the user's token from within a message handler via the `userGraph` prop.

<!-- user-graph-example -->

```typescript
import * as endpoints from '@microsoft/teams.graph-endpoints';

// Gets details of the current user
app.on('message', async ({ activity, userGraph }) => {
  const me = await userGraph.call(endpoints.me.get);
  console.log(`User ID: ${me.id}`);
  console.log(`User Display Name: ${me.displayName}`);
  console.log(`User Email: ${me.mail}`);
  console.log(`User Job Title: ${me.jobTitle}`);
});
```

<!-- user-graph-object -->

`userGraph`

<!-- app-graph-in-handler -->

`appGraph`

<!-- app-graph-reference -->

`app.graph`

<!-- advanced-sections -->

## The Graph Client

The Graph Client provides a straight-forward `call` method to interact with Microsoft Graph and issue requests scoped to a specific user or application. Paired with the Graph Endpoints packages, it offers discoverable and type-safe access to the vast Microsoft Graph API surface.

Having an understanding of [how the graph API works](https://learn.microsoft.com/en-us/graph/use-the-api) will help you make the most of the library. For example, to get the `id` of the chat instance between a user and an app, [Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/userscopeteamsappinstallation-get-chat?view=graph-rest-1.0&tabs=http) exposes it via:

```
GET /users/{user-id | user-principal-name}/teamwork/installedApps/{app-installation-id}/chat
```

The equivalent using the graph client would look like this:

```ts
import { users } from '@microsoft/teams.graph-endpoints';

const chat = await userGraph.call(users.teamwork.installedApps.chat.get, {
  'user-id': user.id,
  'userScopeTeamsAppInstallation-id': appInstallationId,
  $select: ['id'],
});
```

Graph APIs often accept arguments that may go into the URL path, the query string, or the request body. As illustrated in this example, all arguments are provided as a second parameter to the `graph.call` method. The graph client puts each value in its place and attaches an authentication token as the request is constructed, and performs the fetch request for you.

## Graph Preview APIs

The Graph Preview APIs are not recommended for production use. However, if you have a need to explore preview APIs, the `@microsoft/teams.graph-endpoints-beta` package makes it easy.

First, install the optional dependency:

```sh
npm install @microsoft/teams.graph-endpoints-beta
```

Then use it just like the regular `@microsoft/teams.graph-endpoints` package.

```ts
import * as endpointsBeta from '@microsoft/teams.graph-endpoints-beta';

// Gets the current user details from /beta/me, rather than from /v1.0/me.
const me = await app.graph.call(endpointsBeta.me.get);
```

The key differences between `@microsoft/teams.graph-endpoints` and `@microsoft/teams.graph-endpoints-beta` are that they represent different Graph API schemas, and that the `graph.call()` method knows to route the request to either /v1.0 or /beta. This means that it's possible to mix'n'match v1.0 and beta endpoints, for instance to explore a novel beta API in a code base that's already relying on v1.0 for all stable APIs.

## Custom Graph API calls

It's possible to craft custom builder functions that work just like the ones provided in the `@microsoft/teams.graph-endpoints` and `@microsoft/teams.graph-endpoints-beta` packages. This can be handy if you wish to provide narrower return types, call some novel API that is supported by the Graph backend but not yet included in the endpoints packages, or avoid taking a dependency on the endpoints packages altogether.

For instance, this will `GET https://graph.microsoft.com/beta/me?$select=displayName` and return an object typed to contain just `displayName`, without taking a dependency on the endpoints packages.

```ts
import { type EndpointRequest } from '@microsoft/teams.graph';

const getMyDisplayName = (): EndpointRequest<{ displayName: string }> => ({
  ver: 'beta', // use the beta endpoint; defaults to 'v1.0' if omitted
  method: 'get', // HTTP method to use
  path: '/me', // endpoint path
  paramDefs: {
    query: ['$select'], // the $select parameter goes in the query string
  },
  params: {
    $select: ['displayName'], // the attribute(s) to select
  },
});

const { displayName } = await app.graph.call(getMyDisplayName);
```

<!-- additional-resources -->

## Additional resources

Microsoft Graph offers an extensive and thoroughly documented API surface. These essential resources will serve as your go-to references for any Graph development work:

- The [Microsoft Graph Rest API reference documentation](https://learn.microsoft.com/en-us/graph/api/overview) gives details for each API, including permissions requirements.
- The [Microsoft Graph REST API beta endpoint reference](https://learn.microsoft.com/en-us/graph/api/overview?view=graph-rest-beta) gives similar information for preview APIs.
- The [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) lets you discover and test drive APIs.

In addition, the following endpoints may be especially interesting to Teams developers:

| Graph endpoints                                                                                                                | Description                                                         |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| [appCatalogs](https://learn.microsoft.com/en-us/graph/api/appcatalogs-list-teamsapps?view=graph-rest-1.0)                      | Apps in the Teams App Catalog                                       |
| [appRoleAssignments](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list-approleassignments?view=graph-rest-1.0) | App role assignments                                                |
| [applicationTemplates](https://learn.microsoft.com/en-us/graph/api/resources/applicationtemplate?view=graph-rest-1.0)          | Applications in the Microsoft Entra App Gallery                     |
| [applications](https://learn.microsoft.com/en-us/graph/api/resources/application?view=graph-rest-1.0)                          | Application resources                                               |
| [chats](https://learn.microsoft.com/en-us/graph/api/chat-list?view=graph-rest-1.0&tabs=http)                                   | Chat resources between users                                        |
| [communications](https://learn.microsoft.com/en-us/graph/api/application-post-calls?view=graph-rest-1.0)                       | Calls and Online meetings                                           |
| [employeeExperience](https://learn.microsoft.com/en-us/graph/api/resources/engagement-api-overview?view=graph-rest-1.0)        | Employee Experience and Engagement                                  |
| [me](https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0&tabs=http)                                       | Same as `/users` but scoped to one user (who is making the request) |
| [teams](https://learn.microsoft.com/en-us/graph/api/resources/team?view=graph-rest-1.0)                                        | Team resources in Microsoft Teams                                   |
| [teamsTemplates](https://learn.microsoft.com/en-us/microsoftteams/get-started-with-teams-templates)                            | Templates used to create teams                                      |
| [teamwork](https://learn.microsoft.com/en-us/graph/api/resources/teamwork?view=graph-rest-1.0)                                 | A range of Microsoft Teams functionalities                          |
| [users](https://learn.microsoft.com/en-us/graph/api/resources/users?view=graph-rest-1.0)                                       | User resources                                                      |
