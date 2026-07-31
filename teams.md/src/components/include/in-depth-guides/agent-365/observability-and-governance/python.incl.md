<!-- reactive-observability -->

```python
from microsoft_teams.apps import Agent365BaggageOptions, App

agent365: Agent365BaggageOptions = {
    "operation_source": "support-agent",
    # Identifiers are included by default. Extra data is opt-in.
    "include": ["agentName"],
}

app = App(telemetry={"agent365": agent365})
```

<!-- exporter-auth -->

Use the app's token provider to request an observability token for the Agentic App Instance.

```python
OBSERVABILITY_SCOPE = "api://9b975845-388f-4429-889e-eab1ef63949c/.default"

token = await app.token_provider.get_agentic_app_instance_token(
    OBSERVABILITY_SCOPE,
    agentic_user.agentic_app_instance_id,
    tenant_id,
)
```

<!-- proactive-observability -->

```python
from microsoft_teams.apps import create_agent365_scope

open_agent365_scope = create_agent365_scope(agent365)

with open_agent365_scope(
    agentic_user=agentic_user,
    conversation_id=conversation_id,
):
    # Create the Agent 365 operation span inside this scope.
    await app.send(
        conversation_id,
        "Digest ready.",
        agentic_identity=agentic_user,
    )
```
