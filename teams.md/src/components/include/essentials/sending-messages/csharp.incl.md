<!-- basic-message-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem label="Controller" value="controller" default>
    ```csharp
    [Message]
    public async Task OnMessage([Context] MessageActivity activity, [Context] IContext.Client client)
    {
        await client.Send($"you said: {activity.Text}");
    }
    ```
  </TabItem>
  <TabItem label="Minimal" value="minimal">
    ```csharp
    app.OnMessage(async context =>
    {
        await context.Send($"you said: {context.activity.Text}");
    });
    ```
  </TabItem>
</Tabs>

<!-- signin-example -->

<Tabs>
  <TabItem label="Controller" value="controller" default>
    ```csharp
    [SignIn.VerifyState]
    public async Task OnVerifyState([Context] SignIn.VerifyStateActivity activity, [Context] IContext.Client client)
    {
        await client.Send("You have successfully signed in!");
    }
    ```
  </TabItem>
  <TabItem label="Minimal" value="minimal">
    ```csharp
    app.OnVerifyState(async context =>
    {
        await context.Send("You have successfully signed in!");
    });
    ```
  </TabItem>
</Tabs>

<!-- signin-event-name -->

`SignIn.VerifyState`

<!-- streaming-example -->

<Tabs>
  <TabItem label="Controller" value="controller" default>
    ```csharp
    [Message]
    public void OnMessage([Context] MessageActivity activity, [Context] IStreamer stream)
    {
        stream.Emit("hello");
        stream.Emit(", ");
        stream.Emit("world!");
        // result message: "hello, world!"
    }
    ```
  </TabItem>
  <TabItem label="Minimal" value="minimal">
    ```csharp
    app.OnMessage(async context =>
    {
        context.Stream.Emit("hello");
        context.Stream.Emit(", ");
        context.Stream.Emit("world!");
        // result message: "hello, world!"
        return Task.CompletedTask;
    });
    ```
  </TabItem>
</Tabs>

<!-- mention-method-name -->

`AddMention`

<!-- mention-example -->

<Tabs>
  <TabItem label="Controller" value="controller" default>
    ```csharp
    [Message]
    public async Task OnMessage([Context] MessageActivity activity, [Context] IContext.Client client)
    {
        await client.Send(new MessageActivity("hi!").AddMention(activity.From));
    }
    ```
  </TabItem>
  <TabItem label="Minimal" value="minimal">
    ```csharp
    app.OnMessage(async context =>
    {
        await context.Send(new MessageActivity("hi!").AddMention(activity.From));
    });
    ```
  </TabItem>
</Tabs>

<!-- targeted-message-example -->

<Tabs>
  <TabItem label="Controller" value="controller" default>
    ```csharp
    [Message]
    public async Task OnMessage([Context] IContext.Client client)
    {
        // Send a private reply visible only to the sender
        await client.Send("Hey! This is a private message just for you!", isTargeted: true);
    }
    ```
  </TabItem>
  <TabItem label="Minimal" value="minimal">
    ```csharp
    app.OnMessage(async context =>
    {
        // Send a private reply visible only to the sender
        await context.Send("Hey! This is a private message just for you!", isTargeted: true);
    });
    ```
  </TabItem>
</Tabs>
