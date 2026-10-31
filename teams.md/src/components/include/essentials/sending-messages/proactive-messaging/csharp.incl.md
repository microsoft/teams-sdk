<!-- conversation-id-field -->

`conversationId`

<!-- install-handler-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem label="SDK 2.0 (Legacy)" value="legacy">
    ```csharp
    app.OnInstall(async (context, cancellationToken) =>
    {
        // Save the conversation id in
        context.Storage.Set(context.Activity.From.AadObjectId!, context.Activity.Conversation.Id);
        await context.Send("Hi! I am going to remind you to say something to me soon!", cancellationToken);
        notificationQueue.AddReminder(context.Activity.From.AadObjectId!, Notifications.SendProactive, 10_000);
    });
    ```
  </TabItem>
  <TabItem label="SDK 2.1+" value="core" default>
    ```csharp
    teams.OnInstall(async (context, cancellationToken) =>
    {
        // Save the conversation id in
        context.State.UserState?.Set("conversationId", context.Activity.Conversation.Id);
        await context.SendAsync("Hi! I am going to remind you to say something to me soon!", cancellationToken);
    });
    ```
  </TabItem>
</Tabs>

<!-- send-proactive-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
public static class Notifications
{
    public static async Task SendProactive(string userId)
    {
        var conversationId = (string?)storage.Get(userId);

        if (conversationId is null) return;

        await app.Send(conversationId, "Hey! It's been a while. How are you?");
    }
}
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1+" default>

```csharp
public static class Notifications
{
    public static async Task SendProactive(Context<TeamsActivity> context, CancellationToken cancellationToken = default)
    {
        var conversationId = context.State.UserState?.Get<string>("conversationId");
        if (string.IsNullOrWhiteSpace(conversationId)) return;

        await app.SendAsync(conversationId, "Hey! It's been a while. How are you?", cancellationToken: cancellationToken);
    }
}
```

  </TabItem>
</Tabs>

<!-- targeted-proactive-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
// When sending proactively, you must provide an explicit recipient account
public static async Task SendTargetedNotification(string conversationId, Account recipient)
{
    var teams = app.UseTeams();
    await teams.Send(
        conversationId,
        new MessageActivity("This is a private notification just for you!")
            .WithRecipient(recipient, isTargeted: true)
    );
}
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1+" default>

```csharp
// When sending proactively, you must provide an explicit recipient account
public static async Task SendTargetedNotification(
    string conversationId,
    Account recipient,
    CancellationToken cancellationToken = default)
{
    await app.SendAsync(
        conversationId,
        new MessageActivityInput()
            .WithText("This is a private notification just for you!")
            .WithRecipient(recipient, isTargeted: true),
        cancellationToken: cancellationToken);
}
```

  </TabItem>
</Tabs>

<!-- app-reply-method-name -->

`app.Reply()` (SDK 2.0) / `app.ReplyAsync()` (SDK 2.2)

<!-- app-send-method-name -->

`app.Send()` (SDK 2.0) / `app.SendAsync()` (SDK >= 2.1)

<!-- threading-proactive-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
// SDK 2.0 builds the thread address from a channel id and the numeric id of the root message
await app.Reply(channelId, messageId, "Thread update!");
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2" default>

```csharp
// chatOrChannelId is channelData.chat.id or channelData.channel.id
// replyChainId is channelData.replyChain.id
await app.ReplyAsync(chatOrChannelId, replyChainId, "Thread update!", cancellationToken: cancellationToken);
```

  </TabItem>
</Tabs>

<!-- threading-top-level-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
// Send a new top-level message to a channel
await app.Send(channelId, "Hello!");
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2" default>

```csharp
// Send a new top-level message to the chat or channel
await app.SendAsync(chatOrChannelId, "Hello!", cancellationToken: cancellationToken);
```

  </TabItem>
</Tabs>

<!-- threading-agentic-example -->

```csharp
// SDK 2.2 and later. AgenticIdentity is null unless the recipient is an agentic user
await app.ReplyAsync(
    chatOrChannelId,
    replyChainId,
    "Thread update!",
    agenticIdentity: context.Activity.Recipient?.GetAgenticIdentity(),
    cancellationToken: cancellationToken);
```

<!-- threading-service-url-note -->

Inside a handler, a response goes to the `ServiceUrl` of the inbound activity.
`app.SendAsync()` and `app.ReplyAsync()` go to the `serviceUrl` argument when you pass one, and otherwise to the service URL of the last inbound activity the app received.
There is no default, so the call throws `InvalidOperationException` until the app has received an activity.
