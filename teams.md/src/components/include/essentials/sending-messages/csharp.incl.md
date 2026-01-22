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
