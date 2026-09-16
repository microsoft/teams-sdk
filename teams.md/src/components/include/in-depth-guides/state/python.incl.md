<!-- setup-example -->

```python
from microsoft_teams.apps import App

app = App(state=True)
```

<!-- oauth-note -->

Registering an OAuth flow with `add_oauth_flow()` automatically enables state so pending sign-ins can be associated with the correct flow. Set `state=False` explicitly to fall back to process-local in-memory maps.

<!-- read-write-example -->

```python
from microsoft_teams.api import MessageActivity
from microsoft_teams.apps import ActivityContext


@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]) -> None:
    assert ctx.state is not None

    count = ctx.state.conversation.get("message_count", 0) + 1
    ctx.state.conversation["message_count"] = count

    if ctx.state.user is not None and ctx.activity.text.startswith("my name is "):
        ctx.state.user["name"] = ctx.activity.text[len("my name is "):].strip()

    name = ctx.state.user.get("name", "there") if ctx.state.user is not None else "there"
    await ctx.send(f"Hello, {name}. Message #{count}.")
```

<!-- state-operations -->

Use `key in scope` to check for a value, `del scope[key]` to remove one, and `clear()` to remove all values. Changes inside stored lists and dictionaries are detected automatically when the turn is saved.

<!-- clear-example -->

```python
await ctx.state.delete()
```

<!-- distributed-intro -->

For production or multi-instance deployments, implement the Teams SDK's `Storage[str, Any]` contract with a shared, durable backend and pass it through `StateOptions`. The state API used by handlers doesn't change:

<!-- distributed-example -->

```python
from typing import Any

from microsoft_teams.apps import App, StateOptions
from microsoft_teams.common import Storage


def create_app(durable_storage: Storage[str, Any]) -> App:
    return App(
        state=StateOptions(
            storage=durable_storage,
            key_prefix="my-app",
        )
    )
```

<!-- distributed-details -->

The SDK serializes each scope as a JSON string and replaces the complete scope on save, so concurrent turns use last-writer-wins semantics. Configure expiry, retries, and other storage-specific behavior on your storage implementation.
