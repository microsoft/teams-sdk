<!-- adding-custom-domains -->

```csharp
var app = new App(new AppOptions
{
    AdditionalAllowedDomains = ["api.my-custom-channel.com"],
});
```

Or via `appsettings.json`:

```json
{
  "Teams": {
    "AdditionalAllowedDomains": ["api.my-custom-channel.com"]
  }
}
```

<!-- disabling-validation -->

```csharp
var app = new App(new AppOptions
{
    AdditionalAllowedDomains = ["*"],
});
```
