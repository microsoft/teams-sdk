<!-- overview -->

Agents may want to expose REST APIs that client applications can call. This SDK makes it easy to implement those APIs through the `app.function()` method. The function takes a name and a callback that implements the function.

<!-- example -->

```typescript
app.function('do-something', () => {
  // do something useful
});
```

This registers a REST API hosted at `http://localhost:{PORT}/api/functions/do-something` or `https://{BOT_DOMAIN}/api/functions/do-something` that clients can POST to. When they do, this SDK validates that the caller provides a valid Microsoft Entra bearer token before invoking the registered callback. If the token is missing or invalid, the request is denied with a HTTP 401.

The function can be typed to accept input arguments. The clients would include those in the POST request payload, and they are made available in the callback through the `data` context argument.

```typescript
app.function<{}, { message: string }>('process-message', ({ data, log }) => {
  log.info(`process-message called with: ${data.message}`);
});
```

<!-- validation-warning -->

:::warning
This SDK does not validate that the function arguments are of the expected types or otherwise trustworthy. You must take care to validate the input arguments before using them.
:::

<!-- return-values -->

If desired, the function can return data to the caller. The return value can be a string, an object, or an array.

```typescript
app.function('get-random-number', () => {
  return '4'; // chosen by fair dice roll;
  // guaranteed to be random
});
```

If your function returns a number, that will be interpreted as an HTTP status code:

```typescript
app.function('privileged-action', ({ userId }) => {
  if (!hasPermission(userId)) {
    return 401; // HTTP response will have status 401: unauthorized
  }
  // ... do something
});
```

<!-- context-intro -->

The function callback receives a context object with a number of useful values. Some originate within the agent itself, while others are furnished by the caller via the HTTP Request.

<!-- context-table -->

| Property                   | Source | Description                                                                                                                               |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `api`                      | Agent  | The API client.                                                                                                                           |
| `appGraph`                 | Agent  | The app graph client.                                                                                                                     |
| `appId`                    | Agent  | Unique identifier assigned to the app after deployment, ensuring correct app instance recognition across hosts.                           |
| `appSessionId`             | Caller | Unique ID for the calling app's session, used to correlate telemetry data.                                                                |
| `authToken`                | Caller | The validated MSAL Entra token.                                                                                                           |
| `channelId`                | Caller | Microsoft Teams ID for the channel associated with the content.                                                                           |
| `chatId`                   | Caller | Microsoft Teams ID for the chat associated with the content.                                                                              |
| `data`                     | Caller | The function payload.                                                                                                                     |
| `getCurrentConversationId` | Agent  | Attempts to find the conversation ID where the app is used and verifies agent-user presence. Returns `undefined` if not found or invalid. |
| `log`                      | Agent  | The app logger instance.                                                                                                                  |
| `meetingId`                | Caller | Meeting ID used by tab when running in meeting context.                                                                                   |
| `messageId`                | Caller | ID of the parent message from which the task module was launched (only available in bot card-launched modules).                           |
| `pageId`                   | Caller | Developer-defined unique ID for the page this content points to.                                                                          |
| `send`                     | Agent  | Sends an activity to the current conversation. Returns `null` if the conversation ID is invalid or undetermined.                          |
| `subPageId`                | Caller | Developer-defined unique ID for the sub-page this content points to. Used to restore specific state within a page.                        |
| `teamId`                   | Caller | Microsoft Teams ID for the team associated with the content.                                                                              |
| `tenantId`                 | Caller | Microsoft Entra tenant ID of the current user, extracted from the validated auth token.                                                   |
| `userId`                   | Caller | Microsoft Entra object ID of the current user, extracted from the validated auth token.                                                   |

<!-- context-validation -->

The `authToken` is validated before the function callback is invoked, and the `tenantId` and `userId` values are extracted from the validated token. In the typical case, the remaining caller-supplied values would reflect what the Teams Tab app retrieves from the teams-js `getContext()` API, but the agent does not validate them.

:::warning
Take care to validate the caller-supplied values before using them. Don't assume that the calling user actually has access to items indicated in the context.
:::

<!-- context-helpers -->

To simplify two common scenarios, the context provides the `getCurrentConversationId` and `send` methods.

- The `getCurrentConversationId` method attempts to find the current conversation ID based on the context provided by the client (chatId and channelId) and validates that both the agent and the calling user are actually present in the conversation. If neither chatId or channelId is provided by the caller, the ID of the 1:1 conversation between the agent and the user is returned.
- The `send` method relies on `getCurrentConversationId` to find the conversation where the app is hosted and posts an activity.

<!-- additional-resources -->

- For details on how to Tab apps can invoke these functions, see the [Executing Functions](./function-calling) in-depth guide.
