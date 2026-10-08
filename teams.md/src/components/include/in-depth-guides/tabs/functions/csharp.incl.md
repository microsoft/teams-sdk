<!-- overview -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

Agents may want to expose REST APIs that client applications can call. SDK 2.0 provides the `app.AddFunction()` helper for this.

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

Agents may want to expose REST APIs that client applications can call. In SDK 2.1, implement these with standard ASP.NET endpoints (for example `app.MapPost(...)`) and protect them with authorization.

  </TabItem>
</Tabs>

<!-- example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
app.AddFunction("do-something", context =>
{
    // do something useful
});
```

This registers `http://localhost:{PORT}/api/functions/do-something` or `https://{BOT_DOMAIN}/api/functions/do-something`.

When called, SDK 2.0 validates the bearer token before invoking your callback. Missing or invalid tokens are rejected with HTTP 401.

Typed payload example:

```csharp
public class ProcessMessageData
{
    [JsonPropertyName("message")]
    public required string Message { get; set; }
}

app.AddFunction<ProcessMessageData>("process-message", context =>
{
    context.Log.Debug($"process-message with: {context.Data.Message}");
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using Microsoft.Teams.Core.Hosting;

public class ProcessMessageData
{
    public required string Message { get; set; }
}

var builder = WebApplication.CreateSlimBuilder(args);
builder.Services.AddBotAuthorization();

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/api/functions/process-message", (ProcessMessageData data, ILogger<Program> logger) =>
{
    logger.LogInformation("process-message with: {Message}", data.Message);
    return Results.Ok(new { success = true });
})
.RequireAuthorization();
```

In SDK 2.1, token validation is handled by ASP.NET auth middleware plus `.RequireAuthorization()`.

  </TabItem>
</Tabs>

<!-- validation-warning -->

:::warning
This SDK does not validate that function arguments are of the expected types or otherwise trustworthy. Always validate request payloads before using them.
:::

<!-- return-values -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

If desired, the function can return data to the caller.

```csharp
app.AddFunction("get-random-number", () =>
{
    return 4; // chosen by fair dice roll;
              // guaranteed to be random
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

In SDK 2.1, return standard ASP.NET minimal API results:

```csharp
app.MapPost("/api/functions/get-random-number", () =>
{
    return Results.Ok(new { value = 4 });
})
.RequireAuthorization();
```

  </TabItem>
</Tabs>

<!-- context-intro -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

The function callback receives a `FunctionContext` object with useful values from the app and caller.

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

SDK 2.1 function endpoints use standard ASP.NET handler parameters instead of a Teams `FunctionContext`.

  </TabItem>
</Tabs>

<!-- context-table -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

| Property       | Source | Description                                                                                                         |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| `Api`          | Agent  | The API client.                                                                                                     |
| `AppId`        | Agent  | Unique identifier assigned to the app after deployment, ensuring correct app instance recognition across hosts.     |
| `AppSessionId` | Caller | Unique ID for the calling app's session, used to correlate telemetry data.                                          |
| `AuthToken`    | Caller | The validated MSAL Entra token.                                                                                     |
| `ChannelId`    | Caller | Microsoft Teams ID for the channel associated with the content.                                                     |
| `ChatId`       | Caller | Microsoft Teams ID for the chat associated with the content.                                                        |
| `Data`         | Caller | The function payload.                                                                                                |
| `Log`          | Agent  | The app logger instance.                                                                                             |
| `MeetingId`    | Caller | Meeting ID used by tab when running in meeting context.                                                             |
| `MessageId`    | Caller | ID of the parent message from which the task module was launched (only available in bot card-launched modules).     |
| `PageId`       | Caller | Developer-defined unique ID for the page this content points to.                                                    |
| `Send`         | Agent  | Sends an activity to the current conversation.                                                                      |
| `SubPageId`    | Caller | Developer-defined unique ID for the sub-page this content points to. Used to restore specific state within a page. |
| `TeamId`       | Caller | Microsoft Teams ID for the team associated with the content.                                                        |
| `TenantId`     | Caller | Microsoft Entra tenant ID of the current user, extracted from the validated auth token.                             |
| `UserId`       | Caller | Microsoft Entra object ID of the current user, extracted from the validated auth token.                             |
| `UserName`     | Caller | Microsoft Entra name of the current user, extracted from the validated auth token.                                  |

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

| Parameter / Source         | Description |
| -------------------------- | ----------- |
| `ProcessMessageData data`  | Request body payload from caller |
| `ClaimsPrincipal user`     | Authenticated user claims |
| `HttpContext`              | Request context (headers, route data, services) |
| `ILogger<T>`               | Logging from DI |
| Other DI services          | Any registered service needed by your endpoint |

  </TabItem>
</Tabs>

<!-- context-validation -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

`AuthToken` is validated before the callback runs, and `TenantId`, `UserId`, and `UserName` are extracted from the validated token. Remaining caller values are not validated by the SDK.

:::warning
Take care to validate caller-supplied values before using them. Don't assume the user has access to IDs passed in context.
:::

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

In SDK 2.1, use `.RequireAuthorization()` so only authenticated callers reach the endpoint. You should still validate caller payload, route values, and business-level authorization.

:::warning
Authentication is not authorization for specific business resources. Always enforce resource-level checks in your handler.
:::

  </TabItem>
</Tabs>

<!-- context-helpers -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

To simplify common scenarios, SDK 2.0 `FunctionContext` provides `Send`.

`Send` posts to the current conversation ID determined from caller context (`chatId`/`channelId`). If neither is provided, it assumes the 1:1 chat between the bot and user.

:::warning
`Send` does not validate that caller-provided chat or channel IDs are correct. Validate caller-provided conversation identifiers before use.
:::

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

In SDK 2.1, implement helper behavior explicitly in your endpoint (for example, resolve target conversation, verify access, then send via `ConversationClient`).

  </TabItem>
</Tabs>

<!-- additional-resources -->

- For the SDK 2.1 route-based example, see `core/samples/TabApp/Program.cs` in the Teams .NET repository.
- For details on how tab apps invoke these functions, see the TypeScript [Executing Functions](../../../../typescript/in-depth-guides/tabs/functions/function-calling) in-depth guide.
