---
sidebar_position: 3
summary:
llms: ignore
---

# Deployment Guide

We cover the most common setup and deployment steps for testing in teams, including configuration instructions, and references for handling potential issues during deployment.

### User Assigned Managed Identity

This section demonstrates how to configure authentication in your application using a **User Assigned Managed Identity** in Azure. You will require this setup if you have `msaAppType: 'UserAssignedMSI'` for the Azure Bot Service (required in dev env generally).

In your `index.ts`, replace the initialization:

```typescript
const app = new App({
  plugins: [new DevtoolsPlugin()],
});
```

with the following code to enable User Assigned Managed Identity authentication:

```typescript
// Create token factory function for Azure Identity
const createTokenFactory = () => {
  return async (scope: string | string[], tenantId?: string): Promise<string> => {
    const managedIdentityCredential = new ManagedIdentityCredential({
      clientId: process.env.CLIENT_ID,
    });
    const scopes = Array.isArray(scope) ? scope : [scope];
    const tokenResponse = await managedIdentityCredential.getToken(scopes, {
      tenantId: tenantId,
    });

    return tokenResponse.token;
  };
};

// Configure authentication using TokenCredentials
const tokenCredentials: TokenCredentials = {
  clientId: process.env.CLIENT_ID || '',
  token: createTokenFactory(),
};

const app = new App({
  ...tokenCredentials,
  plugins: [new DevtoolsPlugin()],
});
```

> **Note:** The `ManagedIdentityCredential` class is available in the [`@azure/identity`](https://www.npmjs.com/package/@azure/identity) package. Make sure to install it using `npm install @azure/identity` and import it in your code.

The `createTokenFactory` function provides a method to retrieve access tokens from Azure on demand, and `TokenCredentials` passes this method to the app.

### Missing Service Principal in the Tenant

This error occurs when the application has a single-tenant Azure Bot Service (`msaAppType: 'SingleTenant'`) instance, but your app registration has not yet been linked to a Service Principal in the tenant.

```sh
[ERROR] @teams/app Request failed with status code 401
[ERROR] @teams/app /aaaabbbb-0000-cccc-1111-dddd2222eeee/oauth2/v2.0/token
[ERROR] @teams/app {
[ERROR] @teams/app   "error": "invalid_client",
[ERROR] @teams/app   "error_description": "AADSTS7000229: The client application 00001111-aaaa-2222-bbbb-3333cccc4444 is missing service principal in the tenant aaaabbbb-0000-cccc-1111-dddd2222eeee. See instructions here: https://go.microsoft.com/fwlink/?linkid=2225119 Trace ID: 0000aaaa-11bb-cccc-dd22-eeeeee333333 Correlation ID: aaaa0000-bb11-2222-33cc-444444dddddd Timestamp: 2025-09-18 01:17:37Z",
[ERROR] @teams/app   "error_codes": [
[ERROR] @teams/app     7000229
[ERROR] @teams/app   ],
[ERROR] @teams/app   "timestamp": "2025-09-18 01:17:37Z",
[ERROR] @teams/app   "trace_id": "0000aaaa-11bb-cccc-dd22-eeeeee333333",
[ERROR] @teams/app   "correlation_id": "aaaa0000-bb11-2222-33cc-444444dddddd",
[ERROR] @teams/app   "error_uri": "https://login.microsoftonline.com/error?code=7000229"
[ERROR] @teams/app }
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
   ![Screenshot of App Registrations pane in Azure Portal showing value of 'Graphlocal' under the 'Managed application in local directory' field.](/screenshots/existing-service-principal.png)
5. **Create a Service Principal if missing**  
   If it doesn’t exist, click **Create Service Principal** . Wait for the page to finish loading.
   ![Screenshot of App Registrations pane in Azure Portal showing value of 'Create Service Principal' under the 'Managed application in local directory' field.](/screenshots/create-service-principal.png)
6. **Restart your app**  
   Once the Service Principal is created, restart your application.
