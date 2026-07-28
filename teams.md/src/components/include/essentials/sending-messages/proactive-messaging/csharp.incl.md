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
  <TabItem label="SDK 2.1 (Preview)" value="core">
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
  <TabItem value="core" label="SDK 2.1 (Preview)">

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
  <TabItem value="core" label="SDK 2.1 (Preview)">

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

`app.Reply()`

<!-- to-thread-id-method-name -->

`Conversation.ToThreadedConversationId()`

<!-- app-send-method-name -->

`app.Send()` (SDK 2.0) / `app.SendAsync()` (SDK 2.1)

<!-- threading-proactive-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
// Send to a specific thread proactively
await app.Reply(conversationId, messageId, "Thread update!");

// Send to a flat conversation (1:1, group chat)
await app.Reply(conversationId, "Hello!");
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (Preview)">

```csharp
// Send to a specific thread proactively
await app.ReplyAsync(conversationId, messageId, "Thread update!", cancellationToken: cancellationToken);

// Send to a flat conversation (1:1, group chat)
await app.ReplyAsync(conversationId, "Hello!", cancellationToken: cancellationToken);
```

  </TabItem>
</Tabs>

<!-- threading-helper-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Api;

var threadId = Conversation.ToThreadedConversationId(conversationId, messageId);
await app.Send(threadId, "Sent via helper");
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (Preview)">

```csharp
using Microsoft.Teams.Api;

var threadId = Conversation.ToThreadedConversationId(conversationId, messageId);
await app.SendAsync(threadId, "Sent via helper", cancellationToken: cancellationToken);
```

  </TabItem>
</Tabs>