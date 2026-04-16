<!-- conversation-id-field -->

`conversationId`

<!-- install-handler-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem label="Minimal" value="minimal">
    ```csharp 
    app.OnInstall(async (context, cancellationToken) =>
    {
        // Save the conversation id in
        context.Storage.Set(activity.From.AadObjectId!, activity.Conversation.Id);
        await context.Send("Hi! I am going to remind you to say something to me soon!", cancellationToken);
        notificationQueue.AddReminder(activity.From.AadObjectId!, Notifications.SendProactive, 10_000);
    });
    ```
  </TabItem>
</Tabs>

<!-- send-proactive-example -->

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

<!-- targeted-proactive-example -->

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

<!-- app-reply-method-name -->

`app.Reply()`

<!-- to-thread-id-method-name -->

`Conversation.ToThreadedConversationId()`

<!-- app-send-method-name -->

`app.Send()`

<!-- threading-proactive-example -->

```csharp
// Send to a specific thread proactively
await app.Reply(conversationId, messageId, "Thread update!");

// Send to a flat conversation (1:1, group chat)
await app.Reply(conversationId, "Hello!");
```

<!-- threading-helper-example -->

```csharp
using Microsoft.Teams.Api;

var threadId = Conversation.ToThreadedConversationId(conversationId, messageId);
await app.Send(threadId, "Sent via helper");
```