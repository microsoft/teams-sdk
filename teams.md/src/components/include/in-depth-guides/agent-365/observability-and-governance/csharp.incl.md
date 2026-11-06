<!-- reactive-observability -->

Teams SDK adds Agent 365 baggage before each reactive turn.

<!-- exporter-auth -->

```csharp
using Microsoft.Identity.Abstractions;
using Microsoft.Identity.Web;

const string observabilityScope =
    "api://9b975845-388f-4429-889e-eab1ef63949c/.default";
var provider =
    webApp.Services.GetRequiredService<IAuthorizationHeaderProvider>();
var tokenOptions = new AuthorizationHeaderProviderOptions
{
    AcquireTokenOptions = new()
    {
        AuthenticationOptionsName = "AzureAd",
        Tenant = agenticIdentity.TenantId
    }
};

tokenOptions.WithAgentUserIdentity(
    agenticIdentity.AgenticAppId!,
    new Guid(agenticIdentity.AgenticUserId!));

string authorization = await provider.CreateAuthorizationHeaderAsync(
    [observabilityScope],
    tokenOptions);
string token = authorization["Bearer ".Length..];
```

<!-- proactive-observability -->

```csharp
var agentDetails = new AgentDetails(
    agentId: agenticIdentity.AgenticAppId,
    agenticUserId: agenticIdentity.AgenticUserId,
    agentBlueprintId: agenticIdentity.AgenticAppBlueprintId,
    tenantId: agenticIdentity.TenantId);

using var scope = InvokeAgentScope.Start(
    new Request(conversationId: conversationId),
    new InvokeAgentScopeDetails(serviceUrl),
    agentDetails);

await teamsApp.SendAsync(
    conversationId,
    "Digest ready.",
    serviceUrl,
    agenticIdentity,
    cancellationToken);
```
