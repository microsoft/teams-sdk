<!-- api-object-name -->

`app.Api`

<!-- api-table -->

| Area            | Description                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Conversations` | Gives your application the ability to perform activities on conversations (send, update, delete messages, etc.), or create conversations (like 1:1 chat with a user) |
| `Meetings`      | Gives your application access to meeting details                                                                                                                     |
| `Teams`         | Gives your application access to team or channel details                                                                                                             |

<!-- api-object-description -->

`Api`

<!-- handler-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem label="Controller" value="controller" default>
    ```csharp
    [Message]
    public async Task OnMessage([Context] MessageActivity activity, [Context] ApiClient api)
    {
        var members = await api.Conversations.Members.Get(context.Conversation.Id);
    }
    ```
  </TabItem>
  <TabItem label="Minimal" value="minimal">
    ```csharp
    app.OnMessage(async context =>
    {
        var members = await context.Api.Conversations.Members.Get(context.Conversation.Id);
    });
    ```
  </TabItem>
</Tabs>

<!-- proactive-example -->

```csharp
const members = await app.Api.Conversations.Members.Get("...");
```
