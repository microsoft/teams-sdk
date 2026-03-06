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
In .NET, targeted message APIs are marked with `[Experimental("TEAMS0002")]` and will produce a compiler error until you opt in. Suppress the diagnostic inline with `#pragma warning disable TEAMS0002` or project-wide in your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);TEAMS0002</NoWarn>
</PropertyGroup>
```
:::

<!-- reactions-preview-note -->

:::tip[.NET]
In .NET, reaction APIs are marked with `[Experimental("TEAMS0001")]` and will produce a compiler error until you opt in. Suppress the diagnostic inline with `#pragma warning disable TEAMS0001` or project-wide in your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);TEAMS0001</NoWarn>
</PropertyGroup>
```
:::
