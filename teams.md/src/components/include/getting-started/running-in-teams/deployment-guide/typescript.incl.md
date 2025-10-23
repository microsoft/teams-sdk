<!-- managed-identity-setup -->

In your `index.ts`, replace the initialization:
```typescript
const app = new App({
  plugins: [new DevtoolsPlugin()]
});
```
with the following code to enable User Assigned Managed Identity authentication: 
```typescript
// Create token factory function for Azure Identity
const createTokenFactory = () => {
  return async (scope: string | string[], tenantId?: string): Promise<string> => {
    const managedIdentityCredential = new ManagedIdentityCredential({
        clientId: process.env.CLIENT_ID
      });
    const scopes = Array.isArray(scope) ? scope : [scope];
    const tokenResponse = await managedIdentityCredential.getToken(scopes, {
      tenantId: tenantId
    });
   
    return tokenResponse.token;
  };
};

// Configure authentication using TokenCredentials
const tokenCredentials: TokenCredentials = {
  clientId: process.env.CLIENT_ID || '',
  token: createTokenFactory()
};

const app = new App({
  ...tokenCredentials,
  plugins: [new DevtoolsPlugin()],
});
```
The `createTokenFactory` function provides a method to retrieve access tokens from Azure on demand, and `TokenCredentials` passes this method to the app.

<!-- service-principal-error -->

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