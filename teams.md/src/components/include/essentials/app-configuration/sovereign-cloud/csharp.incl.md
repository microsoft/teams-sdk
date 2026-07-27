<!-- configuration -->

:::info[SDK 2.1 Preview]
The **Teams SDK for .NET 2.1** preview doesn't use the `Teams:Cloud` presets shown below. For sovereign clouds, set the relevant endpoints alongside your `AzureAd` credentials in `appsettings.json` — the Entra login instance via `AzureAd:Instance`, and the Bot Framework endpoints under a `BotFramework` section:

```json title="appsettings.json (US Gov example)"
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.us/",
    "TenantId": "your-tenant-id",
    "ClientId": "your-client-id"
  },
  "BotFramework": {
    "OpenIdMetadataUrl": "https://login.botframework.azure.us/v1/.well-known/openid-configuration",
    "BotTokenIssuer": "https://api.botframework.us"
  }
}
```

When these aren't set, the SDK defaults to the public-cloud endpoints. The `Teams:Cloud` configuration below applies to SDK 2.0.
:::

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
