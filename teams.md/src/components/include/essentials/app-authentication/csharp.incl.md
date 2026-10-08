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

Configure the following settings in `appsettings.json`:

```json title="appsettings.json"
{
  "AzureAd": {
    "ClientId": "your-client-id-here",
    "TenantId": "your-tenant-id",
    "ClientCredentials": [
      {
        "SourceType": "ClientSecret",
        "ClientSecret": "your-client-secret-here"
      }
    ]
  }
}
```

</TabItem>
</Tabs>

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

Your application should automatically use User Assigned Managed Identity authentication when you provide the `ClientId` without a `ClientSecret`.

Configure the following settings in `appsettings.json`:

```json title="appsettings.json"
{
  "AzureAd": {
    "ClientId": "your-client-id-here",
    "TenantId": "your-tenant-id"
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

Depending on the type of managed identity you select, configure the corresponding settings in `appsettings.json`.

```json title="appsettings.json"
{
  "AzureAd": {
    "ClientId": "your-app-client-id-here",
    "TenantId": "your-tenant-id",
    "ClientCredentials": [
      {
        "SourceType": "SignedAssertionFromManagedIdentity",
        "ManagedIdentityClientId": "your-managed-identity-client-id-here"
      }
    ]
  }
}
```

For system-assigned identity, omit `ManagedIdentityClientId`:

```json title="appsettings.json"
{
  "AzureAd": {
    "ClientId": "your-app-client-id-here",
    "TenantId": "your-tenant-id",
    "ClientCredentials": [
      {
        "SourceType": "SignedAssertionFromManagedIdentity"
      }
    }
  }
}
```

</TabItem>
</Tabs>
