<!-- intro -->

The Teams SDK exposes a fluent router so you can subscribe to these activities with dedicated handler methods using minimal APIs.

<!-- basic-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

Slash commands arrive as targeted messages. Check `Recipient.IsTargeted` and handle them explicitly:

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    await context.Send($"you said: {context.Activity.Text}", cancellationToken);
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    await context.SendAsync($"you said: {context.Activity.Text}", cancellationToken);
});
```

  </TabItem>
</Tabs>

<!-- example-explanation -->

In the above example, the `context.Activity` property is of type `MessageActivity`, which has a `Text` property. You'll notice that the handler here does not return anything, but instead handles the activity by `Send`ing a message back. For message activities, Teams does not expect your application to return anything (though it's usually a good idea to send some sort of friendly acknowledgment!).

<!-- slash-command-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

Slash commands arrive as targeted messages. Check `Recipient.IsTargeted` and handle them explicitly:

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    if (context.Activity.Recipient?.IsTargeted == true)
    {
        await context.Send($"Received slash command: {context.Activity.Text}", cancellationToken);
    }
});
```

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

Slash commands arrive as targeted messages. Check `Recipient.IsTargeted` and handle them explicitly:

```csharp
teams.OnMessage(async (context, cancellationToken) =>
{
    if (context.Activity.Recipient?.IsTargeted == true)
    {
        await context.SendAsync($"Received slash command: {context.Activity.Text}", cancellationToken);
    }
});
```

  </TabItem>
</Tabs>

<!-- activity-handlers-next -->
N/A

<!-- activity-reference-footer -->

N/A
