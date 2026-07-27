<!-- configure-application -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

:::note
The environment file approach is not yet supported for C#. You need to configure authentication programmatically in your code.
:::

In your `Program.cs`, replace the initialization:
```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddTeams();
```
with the following code to enable User Assigned Managed Identity authentication:
```csharp
var builder = WebApplication.CreateBuilder(args);

Func<string[], string?, Task<ITokenResponse>> createTokenFactory = async (string[] scopes, string? tenantId) =>
{
    var clientId = Environment.GetEnvironmentVariable("CLIENT_ID");
    var managedIdentityCredential = new ManagedIdentityCredential(clientId);
    var tokenRequestContext = new TokenRequestContext(scopes, tenantId: tenantId);
    var accessToken = await managedIdentityCredential.GetTokenAsync(tokenRequestContext);

    return new TokenResponse
    {
        TokenType = "Bearer",
        AccessToken = accessToken.Token,
    };
};

var appBuilder = App.Builder()
    .AddCredentials(new TokenCredentials(
        Environment.GetEnvironmentVariable("CLIENT_ID") ?? string.Empty,
        async (tenantId, scopes) =>
        {
            return await createTokenFactory(scopes, tenantId);
        }
    ));

builder.AddTeams(appBuilder);
```

The `createTokenFactory` function provides a method to retrieve access tokens from Azure on demand, and `TokenCredentials` passes this method to the app.

## Configuration

Set the following environment variable:

- `CLIENT_ID`: Your Application (client) ID

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

In the 2.1 preview there's no code change to switch credential types. All authentication is configured through the standard `AzureAd` section in `appsettings.json`, and the SDK auto-detects the credential type based on which fields are present.

For **User Assigned Managed Identity**, set `ClientId` to the managed identity's client ID and omit `ClientCredentials` entirely — the SDK infers UMI and acquires tokens through the IMDS endpoint:

```json title="appsettings.json"
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "your-tenant-id",
    "ClientId": "your-user-assigned-managed-identity-client-id"
  }
}
```

No `Program.cs` changes are needed — `builder.Services.AddTeamsBotApplication()` reads this section on startup. Because configuration follows the standard ASP.NET Core resolution order, you can override any value with environment variables (for example `AzureAd__ClientId`), user secrets, or command-line arguments.

</TabItem>
</Tabs>

<!-- availability-note -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

:::note
C# uses `appsettings.json` and process environment variables via `IConfiguration` (the standard ASP.NET Core pattern). `.env` files are not used.
:::

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

:::note
In the 2.1 preview, client secrets, user-assigned managed identities, system-assigned managed identities, and federated identity credentials all resolve from the same `AzureAd` section — the credential type is inferred from which fields are present. Client secrets and FIC are expressed through the standard Microsoft.Identity.Web `ClientCredentials` array (for example `"SourceType": "ClientSecret"` or `"SourceType": "SignedAssertionFromManagedIdentity"`). See the [2.1 announcement](/blog/announcing-teams-sdk-dotnet-2-1-preview#native-aspnet-core-integration) for the full config block.
:::

</TabItem>
</Tabs>

<!-- sovereign-cloud-overrides -->

For scenarios requiring customization of individual cloud endpoints — such as China single-tenant bots that need a tenant-specific login URL — C# supports per-endpoint overrides in `appsettings.json`:

```json
{
  "Teams": {
    "Cloud": "China",
    "LoginTenant": "your-tenant-id"
  }
}
```

Available override properties: `LoginEndpoint`, `LoginTenant`, `BotScope`, `TokenServiceUrl`, `OpenIdMetadataUrl`, `TokenIssuer`, `GraphScope`
