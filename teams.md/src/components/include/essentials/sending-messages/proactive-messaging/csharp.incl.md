<!-- conversation-id-field -->

`conversationId`

<!-- install-handler-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
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