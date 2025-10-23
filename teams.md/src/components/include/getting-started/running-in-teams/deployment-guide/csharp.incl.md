<!-- managed-identity-setup -->

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
The `createTokenFactory` function provides a method to retrieve access tokens from Azure on demand, and `token_credentials` passes this method to the app.

<!-- service-principal-error -->

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