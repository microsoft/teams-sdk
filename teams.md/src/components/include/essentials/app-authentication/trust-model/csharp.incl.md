<!-- custom-route-shared-secret-example -->

```csharp
// ASP.NET middleware: gate a custom route with a shared secret.
app.Use(async (ctx, next) =>
{
    var secret = Environment.GetEnvironmentVariable("WEBHOOK_SECRET") ?? string.Empty;
    var expected = "Bearer " + secret;
    if (ctx.Request.Path.StartsWithSegments("/webhooks/external") &&
        ctx.Request.Headers.Authorization != expected)
    {
        ctx.Response.StatusCode = 401;
        return;
    }
    await next();
});
```
