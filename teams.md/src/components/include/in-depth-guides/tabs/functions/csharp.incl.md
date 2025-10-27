<!-- overview -->

Agents may want to expose REST APIs that client applications can call. This library makes it easy to implement those APIs through the `app.AddFunction()` method. The function takes a name and a callback that implements the function.

<!-- example -->

```csharp
app.AddFunction('do-something', (context) => {
  // do something useful
});
```

This registers a REST API hosted at `http://localhost:{PORT}/api/functions/do-something` or `https://{BOT_DOMAIN}/api/functions/do-something` that clients can POST to. When they do, this library validates that the caller provides a valid Microsoft Entra bearer token before invoking the registered callback. If the token is missing or invalid, the request is denied with a HTTP 401.

The function can be typed to accept input arguments. The clients would include those in the POST request payload, and they are made available in the callback through the `Data` context argument.

```csharp
public class ProcessMessageData
{
    [JsonPropertyName("message")]
    public required string Message { get; set; }
}

// ...

app.AddFunction<ProcessMessageData> ("process-message", (context) => {
    context.Log.Debug($"process-message with: {context.Data.Message}");
});

```

<!-- validation-warning -->

:::warning
This library does not validate that the function arguments are of the expected types or otherwise trustworthy. You must take care to validate the input arguments before using them.
:::

<!-- return-values -->

If desired, the function can return data to the caller.

```csharp
app.AddFunction('get-random-number', () => {
    return 4; // chosen by fair dice roll;
              // guaranteed to be random
});
```

<!-- context-intro -->

The function callback receives a context object with a number of useful values. Some originate within the agent itself, while others are furnished by the caller via the HTTP Request.

<!-- context-table -->

| Property       | Source | Description                                                                                                        |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| `Api`          | Agent  | The API client.                                                                                                    |
| `AppId`        | Agent  | Unique identifier assigned to the app after deployment, ensuring correct app instance recognition across hosts.    |
| `AppSessionId` | Caller | Unique ID for the calling app's session, used to correlate telemetry data.                                         |
| `AuthToken`    | Caller | The validated MSAL Entra token.                                                                                    |
| `ChannelId`    | Caller | Microsoft Teams ID for the channel associated with the content.                                                    |
| `ChatId`       | Caller | Microsoft Teams ID for the chat associated with the content.                                                       |
| `Data`         | Caller | The function payload.                                                                                              |
| `Log`          | Agent  | The app logger instance.                                                                                           |
| `MeetingId`    | Caller | Meeting ID used by tab when running in meeting context.                                                            |
| `MessageId`    | Caller | ID of the parent message from which the task module was launched (only available in bot card-launched modules).    |
| `PageId`       | Caller | Developer-defined unique ID for the page this content points to.                                                   |
| `Send`         | Agent  | Sends an activity to the current conversation.                                                                     |
| `SubPageId`    | Caller | Developer-defined unique ID for the sub-page this content points to. Used to restore specific state within a page. |
| `TeamId`       | Caller | Microsoft Teams ID for the team associated with the content.                                                       |
| `TenantId`     | Caller | Microsoft Entra tenant ID of the current user, extracted from the validated auth token.                            |
| `UserId`       | Caller | Microsoft Entra object ID of the current user, extracted from the validated auth token.                            |
| `UserName`     | Caller | Microsoft Entra name of the current user, extracted from the validated auth token.                                 |

<!-- context-validation -->

The `AuthToken` is validated before the function callback is invoked, and the `TenantId`, `UserId`, and `UserName` values are extracted from the validated token. In the typical case, the remaining caller-supplied values would reflect what the Teams Tab app retrieves from the teams-js `getContext()` API, but the agent does not validate these.

:::warning
Take care to validate the caller-supplied values before using them. Don't assume that the calling user actually has access to items indicated in the context.
:::

<!-- context-helpers -->

To simplify a common scenarios, the context provides a `Send` method. This method sends an activity to the current conversation ID, determined from the context values provided by the client (chatId and channelId). If neither chatId or channelId is provided by the caller, the ID of the 1:1 conversation between the agent and the user is assumed.

:::warning
The `Send` method does not validate that the chat ID or conversation ID provided by the caller is valid or correct. You must take care to validate that the user and agent both have appropriate access to the conversation.
:::

<!-- additional-resources -->

- For details on how to Tab apps can call these functions, see the TypeScript [Executing Functions](../../../../typescript/in-depth-guides/tabs/functions/function-calling) in-depth guide.
- For more information about the teams-js getContext() API, see the [Teams JavaScript client library](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/using-teams-client-library) documentation.
