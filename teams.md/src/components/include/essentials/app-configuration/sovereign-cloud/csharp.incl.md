<!-- configuration -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">
The configuration below is only valid for **SDK 2.0** apps. It uses SDK 2.0 `Teams:Cloud` presets and per endpoint overrides. 
In `appsettings.json`:

```json
{
  "Teams": {
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "TenantId": "your-tenant-id",
    "Cloud": "USGov",
    "LoginTenant": "your-tenant-id"
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

Available override properties: `LoginEndpoint`, `LoginTenant`, `BotScope`, `TokenServiceUrl`, `OpenIdMetadataUrl`, `TokenIssuer`, `GraphScope`

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

For 2.1, configure sovereign cloud endpoints as shown below.

```json title="Properties/launchSettings.json (US Gov example)"
{
  "profiles": {
    "YourBot": {
      "commandName": "Project",
      "environmentVariables": {
        "AzureAd__Instance": "https://login.microsoftonline.us/",
        "AzureAd__TenantId": "your-tenant-id",
        "AzureAd__ClientId": "your-client-id",
        "BotFramework__OpenIdMetadataUrl": "https://login.botframework.azure.us/v1/.well-known/openid-configuration",
        "BotFramework__BotTokenIssuer": "https://api.botframework.us"
      }
    }
  }
}
```

For deployed environments, set equivalent values via app configuration or environment variables. When these aren't set, the SDK defaults to public-cloud endpoints.

</TabItem>
</Tabs>

<!-- per-endpoint-overrides -->

N/A

<!-- troubleshooting-china-tenant -->

N/A

<!-- troubleshooting-cloud-env-ignored -->

N/A