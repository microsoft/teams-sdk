<!-- configure-application -->

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

<!-- availability-note -->

:::note
C# uses `appsettings.json` and process environment variables via `IConfiguration` (the standard ASP.NET Core pattern). `.env` files are not used.
:::

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
