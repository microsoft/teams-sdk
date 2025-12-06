<!-- agent-card -->

`agent_card`

<!-- plugin-example -->

```python
from os import getenv
from a2a.types import AgentCard, AgentCapabilities, AgentSkill
from microsoft_teams.a2a import A2APlugin, A2APluginOptions
from microsoft_teams.apps import App, PluginBase

PORT = getenv("PORT", "4000")

agent_card = AgentCard(
    name="weather_agent",
    description="An agent that can tell you the weather",
    url=f"http://localhost:{PORT}/a2a/",
    version="0.0.1",
    protocol_version="0.3.0",
    capabilities=AgentCapabilities(),
    default_input_modes=[],
    default_output_modes=[],
    skills=[
        AgentSkill(
            # Expose various skills that this agent can perform
            id="get_weather",
            name="Get Weather",
            description="Get the weather for a given location",
            tags=["weather", "get", "location"],
            examples=[
                # Give concrete examples on how to contact the agent
                "Get the weather for London",
                "What is the weather",
                "What's the weather in Tokyo?",
                "How is the current temperature in San Francisco?",
            ],
        ),
    ],
)

plugins: List[PluginBase] = [A2APlugin(A2APluginOptions(agent_card=agent_card))]
app = App(logger=logger, plugins=plugins)
```

<!-- event-handler -->

```python
from microsoft_teams.a2a import A2AMessageEvent, A2AMessageEventKey
from a2a.types import TextPart

@app.event(A2AMessageEventKey)
async def handle_a2a_message(message: A2AMessageEvent) -> None:
    request_context = message.get("request_context")
    respond = message.get("respond")

    logger.info(f"Received message: {request_context.message}")

    if request_context.message:
        text_input = None
        for part in request_context.message.parts:
            if getattr(part.root, "kind", None) == "text":
                text_part = cast(TextPart, part.root)
                text_input = text_part.text
                break
        if not text_input:
            await respond("My agent currently only supports text input")
            return

        result = await my_event_handler(text_input)
        await respond(result)
```
