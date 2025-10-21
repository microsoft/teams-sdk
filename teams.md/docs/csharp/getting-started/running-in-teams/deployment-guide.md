---
sidebar_position: 3
summary:
llms: ignore
---

# Deployment Guide

We cover the most common setup and deployment steps for testing in Teams, including configuration instructions, and references for handling potential issues during deployment.

### User Assigned Managed Identity

This section demonstrates how to configure authentication in your application using a **User Assigned Managed Identity** in Azure. If you are using `msaAppType: 'UserAssignedMSI'` for the Azure Bot Service (required in dev env generally).

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

> **Note:** The `ManagedIdentityCredential` class is available in the [`Azure.Identity`](https://www.nuget.org/packages/Azure.Identity/) package. Make sure to install it using `dotnet add package Azure.Identity` and include the necessary using statement in your code.

The `createTokenFactory` function provides a method to retrieve access tokens from Azure on demand, and `token_credentials` passes this method to the app.

### Missing Service Principal in the Tenant

This error occurs when the application has a single-tenant Azure Bot Service (`msaAppType: 'SingleTenant'`) instance, but your app registration has not yet been linked to a Service Principal in the tenant.

```sh
[ERROR] Echobot Failed to get bot token on app startup.
[ERROR] Echobot {
[ERROR] Echobot   "error": "invalid_client",
[ERROR] Echobot   "error_description": "AADSTS7000229: The client application 00001111-aaaa-2222-bbbb-3333cccc4444 is missing service principal in the tenant aaaabbbb-0000-cccc-1111-dddd2222eeee. See instructions here: https://go.microsoft.com/fwlink/?linkid=2225119 Trace ID: 0000aaaa-11bb-cccc-dd22-eeeeee333333 Correlation ID: aaaa0000-bb11-2222-33cc-444444dddddd Timestamp: 2025-09-18 02:26:20Z",
[ERROR] Echobot   "error_codes": [
[ERROR] Echobot     7000229
[ERROR] Echobot   ],
[ERROR] Echobot   "timestamp": "2025-09-18 02:26:20Z",
[ERROR] Echobot   "trace_id": "0000aaaa-11bb-cccc-dd22-eeeeee333333",
[ERROR] Echobot   "correlation_id": "aaaa0000-bb11-2222-33cc-444444dddddd",
[ERROR] Echobot   "error_uri": "https://login.microsoftonline.com/error?code=7000229"
[ERROR] Echobot }
```

1. **Sign in to Azure Portal**  
   Go to [https://portal.azure.com](https://portal.azure.com) and log in with your Azure account.
2. **Navigate to App Registrations**  
   In the top search bar, search for **App registrations** and select it.
3. **Search for your application**  
   Use the **BOT_ID** from your environment file:
   - Local development → `env/.env.local`
   - Azure deployment → `env/.env.dev`
4. **Check if a Service Principal exists**  
   Open the app registration and verify if a Service Principal is created. If it exists already, you should see an entry for a **Managed Application in your local directory** if it exists.
   ![Existing Service Principal](/screenshots/existing-service-principal.png)
5. **Create a Service Principal if missing**  
   If it doesn’t exist, click **Create Service Principal** . Wait for the page to finish loading.
   ![Create Service Principal](/screenshots/create-service-principal.png)
6. **Restart your app**  
   Once the Service Principal is created, restart your application.
