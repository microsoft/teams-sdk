<!-- basic-message-example -->

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    await context.Send($"you said: {context.activity.Text}", cancellationToken);
});
```

<!-- signin-example -->

  ```csharp
  app.OnVerifyState(async (context, cancellationToken) =>
  {
      await context.Send("You have successfully signed in!", cancellationToken);
  });
  ```

<!-- signin-event-name -->

`SignIn.VerifyState`

<!-- streaming-example -->

```csharp
app.OnMessage(async (context, cancellationToken) =>
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
app.OnMessage(async (context, cancellationToken) =>
{
    await context.Send(new MessageActivity("hi!").AddMention(activity.From), cancellationToken);
});
```

<!-- targeted-method-name -->

`WithRecipient`

<!-- targeted-send-example -->

```csharp
app.OnMessage(async (context, cancellationToken) =>
{
    // Using WithRecipient with isTargeted=true explicitly targets the specified recipient
    await context.Send(
        new MessageActivity("This message is only visible to you!")
            .WithRecipient(context.Activity.From, isTargeted: true),
        cancellationToken
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

<!-- reactions-preview-note -->

:::tip[.NET]
In .NET, reaction APIs are marked with `[Experimental("ExperimentalTeamsReactions")]` and will produce a compiler error until you opt in. Suppress the diagnostic inline with `#pragma warning disable ExperimentalTeamsReactions` or project-wide in your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);ExperimentalTeamsReactions</NoWarn>
</PropertyGroup>
```
:::
