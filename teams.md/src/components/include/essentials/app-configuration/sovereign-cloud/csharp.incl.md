<!-- configuration -->

In `appsettings.json`:

```json
{
  "Teams": {
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "TenantId": "your-tenant-id",
    "Cloud": "USGov"
  }
}
```

Or programmatically:

```csharp
var app = new App(new AppOptions
{
    Cloud = CloudEnvironment.USGov,
    Credentials = new ClientCredentials("client-id", "client-secret")
});
```

**Available cloud presets:** `CloudEnvironment.Public`, `CloudEnvironment.USGov`, `CloudEnvironment.USGovDoD`, `CloudEnvironment.China`

<!-- per-endpoint-overrides -->

In `appsettings.json`:

```json
{
  "Teams": {
    "Cloud": "China",
    "LoginTenant": "your-tenant-id"
  }
}
```

<!-- troubleshooting-china-tenant -->

In `appsettings.json`:

```json
{
  "Teams": {
    "Cloud": "China",
    "LoginTenant": "your-tenant-id"
  }
}
```
