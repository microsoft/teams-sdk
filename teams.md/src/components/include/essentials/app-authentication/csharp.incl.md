<!-- client-secret-configuration -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

Set the following environment variables in your application:

- `CLIENT_ID`: Your Application (client) ID
- `CLIENT_SECRET`: The client secret value you created
- `TENANT_ID`: The tenant id where your bot is registered
 
```env
CLIENT_ID=your-client-id-here
CLIENT_SECRET=your-client-secret-here
TENANT_ID=your-tenant-id
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

Set the following environment variables in your application:

- `ClientId`: Your Application (client) ID
- `ClientSecret`: The client secret value you created
- `TenantId`: The tenant id where your bot is registered

```json title="Properties/launchSettings.json"
{
  "profiles": {
    "MyBot": {
      "environmentVariables": {
        "AzureAd__ClientId": "your-client-id-here",
        "AzureAd__TenantId": "your-tenant-id",
        "AzureAd__ClientCredentials__0__SourceType": "ClientSecret",
        "AzureAd__ClientCredentials__0__ClientSecret": "your-client-secret-here"
      }
    }
  }
}
```

</TabItem>
</Tabs>

<!-- custom-route-shared-secret-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
// ASP.NET middleware: gate a custom route with a shared secret.
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/webhooks/external") &&
        ctx.Request.Headers.Authorization != $"Bearer {Environment.GetEnvironmentVariable("WEBHOOK_SECRET")}")
    {
        ctx.Response.StatusCode = 401;
        return;
    }
    await next();
});
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
// ASP.NET middleware: gate a custom route with a shared secret.
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/webhooks/external") &&
        ctx.Request.Headers.Authorization != $"Bearer {Environment.GetEnvironmentVariable("WEBHOOK_SECRET")}")
    {
        ctx.Response.StatusCode = 401;
        return;
    }
    await next();
});
```

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

<!-- umi-configuration -->

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

Set the following environment variables:

- `CLIENT_ID`: Your Application (client) ID

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

Your application should automatically use User Assigned Managed Identity authentication when you provide the `ClientId` environment variable without a `ClientSecret`.

Set the following environment variables in your application:

- `ClientId`: Your Application (client) ID
- **Do not set** `ClientSecret`
- `TenantId`: The tenant id where your bot is registered

```json title="Properties/launchSettings.json"
{
  "profiles": {
    "MyBot": {
      "environmentVariables": {
        "AzureAd__ClientId": "your-client-id-here",
        "AzureAd__TenantId": "your-tenant-id"
      }
    }
  }
}
```

</TabItem>
</Tabs>

<!-- fic-configuration -->

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
    var managedIdentityClientIdRaw = Environment.GetEnvironmentVariable("MANAGED_IDENTITY_CLIENT_ID");
    var managedIdentityClientId =
        string.IsNullOrWhiteSpace(managedIdentityClientIdRaw) ||
        string.Equals(managedIdentityClientIdRaw, "system", StringComparison.OrdinalIgnoreCase)
            ? null
            : managedIdentityClientIdRaw;
    var managedIdentityCredential = new ManagedIdentityCredential(managedIdentityClientId);
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
        async (tenantId, scopes) => await createTokenFactory(scopes, tenantId)));

builder.AddTeams(appBuilder);
```

The `createTokenFactory` function provides a method to retrieve access tokens from Azure on demand, and `TokenCredentials` passes this method to the app.

Set the following environment variables:

- `CLIENT_ID`: Your Application (client) ID
- `MANAGED_IDENTITY_CLIENT_ID`: The managed identity client ID, or `system` for system-assigned identity
- `TENANT_ID`: The tenant id where your bot is registered

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

Depending on the type of managed identity you select, set the environment variables accordingly.

```json title="Properties/launchSettings.json"
{
  "profiles": {
    "MyBot": {
      "environmentVariables": {
        "AzureAd__ClientId": "your-app-client-id-here",
        "AzureAd__TenantId": "your-tenant-id",
        "AzureAd__ClientCredentials__0__SourceType": "SignedAssertionFromManagedIdentity",
        "AzureAd__ClientCredentials__0__ManagedIdentityClientId": "your-managed-identity-client-id-here"
      }
    }
  }
}
```

For system-assigned identity, set:

```json title="Properties/launchSettings.json"
{
  "profiles": {
    "MyBot": {
      "environmentVariables": {
        "AzureAd__ClientId": "your-app-client-id-here",
        "AzureAd__TenantId": "your-tenant-id",
        "AzureAd__ClientCredentials__0__SourceType": "SignedAssertionFromManagedIdentity"
      }
    }
  }
}
```

</TabItem>
</Tabs>
