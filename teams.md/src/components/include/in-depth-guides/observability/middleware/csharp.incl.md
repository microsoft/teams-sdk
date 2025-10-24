<!-- app-use-method -->
`app.Use`

<!-- middleware-example -->

```csharp
app.Use(async context =>
{
    var start = DateTime.UtcNow;
    try
    {
        await context.Next();
    } catch
    {
        context.Log.Error("error occurred during activity processing");
    }
    context.Log.Debug($"request took {(DateTime.UtcNow - start).TotalMilliseconds}ms");
});
```