<!-- basic-message-example -->

```csharp
app.OnMessage(async context =>
{
    await context.Send($"you said: {context.activity.Text}");
});
```

<!-- signin-example -->

  ```csharp
  app.OnVerifyState(async context =>
  {
      await context.Send("You have successfully signed in!");
  });
  ```

<!-- signin-event-name -->

`SignIn.VerifyState`

<!-- streaming-example -->

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

<!-- mention-method-name -->

`AddMention`

<!-- mention-example -->

```csharp
app.OnMessage(async context =>
{
    await context.Send(new MessageActivity("hi!").AddMention(activity.From));
});
```

<!-- targeted-method-name -->

`WithRecipient`

<!-- targeted-send-example -->

```csharp
app.OnMessage(async context =>
{
    // Using WithRecipient with isTargeted=true explicitly targets the specified recipient
    await context.Send(
        new MessageActivity("This message is only visible to you!")
            .WithRecipient(context.Activity.From, isTargeted: true)
    );
});
```

<!-- targeted-preview-note -->

:::tip[.NET]
In .NET, targeted message APIs are marked with `[Experimental("ExperimentalTeamsTargeted")]` and will produce a compiler error until you opt in. Suppress the diagnostic inline with `#pragma warning disable ExperimentalTeamsTargeted` or project-wide in your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);ExperimentalTeamsTargeted</NoWarn>
</PropertyGroup>
```
:::

<!-- reactions-example -->

```csharp
app.OnMessage(async context =>
{
    // Add a reaction to the message
    await context.Api.Reactions.Add(context.Activity.Conversation.Id, context.Activity.Id, "like");

    // Remove a reaction from the message
    await context.Api.Reactions.Remove(context.Activity.Conversation.Id, context.Activity.Id, "like");
});
```

<!-- reactions-event-example -->

```csharp
app.OnMessageReaction(async context =>
{
    foreach (var reaction in context.Activity.ReactionsAdded ?? [])
    {
        await context.Send($"{reaction.User?.DisplayName ?? "Someone"} added a {reaction.Type} reaction!");
    }

    foreach (var reaction in context.Activity.ReactionsRemoved ?? [])
    {
        await context.Send($"{reaction.User?.DisplayName ?? "Someone"} removed a {reaction.Type} reaction.");
    }
});
```

<!-- reactions-preview-note -->

:::tip[.NET]
In .NET, reaction APIs are marked with `[Experimental("ExperimentalTeamsReactions")]` and will produce a compiler error until you opt in. Suppress the diagnostic inline with `#pragma warning disable ExperimentalTeamsReactions` or project-wide in your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);ExperimentalTeamsReactions</NoWarn>
</PropertyGroup>
```
:::
