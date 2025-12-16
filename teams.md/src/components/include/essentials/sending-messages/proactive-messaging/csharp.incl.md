<!-- conversation-id-field -->

`conversationId`

<!-- install-handler-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem label="Controller" value="controller" default>
    ```csharp
    // Installation is just one place to get the conversation id. All activities
    // have the conversation id, so you can use any activity to get it.
    [Install]
    public async Task OnInstall([Context] InstallUpdateActivity activity, [Context] IContext.Client client, [Context] IStorage<string, object> storage)
    {
        // Save the conversation id in 
        storage.Set(activity.From.AadObjectId!, activity.Conversation.Id);
        await client.Send("Hi! I am going to remind you to say something to me soon!");
        notificationQueue.AddReminder(activity.From.AadObjectId!, Notifications.SendProactive, 10_000);
    }
    ```
  </TabItem>
  <TabItem label="Minimal" value="minimal">
    ```csharp 
    app.OnInstall(async context =>
    {
        // Save the conversation id in 
        context.Storage.Set(activity.From.AadObjectId!, activity.Conversation.Id);
        await context.Send("Hi! I am going to remind you to say something to me soon!");
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
public static class Notifications
{
    public static async Task SendProactiveTargeted(string userId)
    {
        var conversationId = (string?)storage.Get(userId);

        if (conversationId is null) return;

        // Set Recipient to specify who should receive the private message
        var targetedMessage = new MessageActivity("Hey! This is a private message just for you!")
        {
            Recipient = new ChannelAccount { Id = userId }
        };

        await app.Send(conversationId, targetedMessage, isTargeted: true);
    }
}
```