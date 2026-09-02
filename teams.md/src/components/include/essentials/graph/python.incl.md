<!-- package-info -->

`microsoft-teams-graph` package

<!-- migration-note -->

N/A

<!-- package-overview -->

N/A

<!-- app-graph-object -->

`app.graph`

<!-- app-graph-example -->

```python
# Equivalent of https://learn.microsoft.com/en-us/graph/api/user-get
# Gets the details of the bot-user
user = await app.graph.me.get()
print(f"User ID: {user.id}")
print(f"User Display Name: {user.display_name}")
print(f"User Email: {user.mail}")
print(f"User Job Title: {user.job_title}")
```
:::tip
You also have access to the `app_graph` object in the activity handler. This is equivalent to `app.graph`.
:::

<!-- user-graph-intro -->

You can also access the graph using the user's token from within a message handler.

<!-- user-graph-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="python-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.1 (Legacy)">

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    user = await ctx.user_graph.me.get()
    print(f"User ID: {user.id}")
    print(f"User Display Name: {user.display_name}")
    print(f"User Email: {user.mail}")
    print(f"User Job Title: {user.job_title}")
```
Here, the "user_graph" object is a scoped graph client for the user that sent the message.

</TabItem>
<TabItem value="core" label="SDK 2.2 (current)" default>

Build the client from an OAuth flow's token, so it's always scoped to the connection that owns it.

```python
from microsoft_teams.graph import get_graph_client

graph = app.add_oauth_flow("graph")

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    token = await graph.sign_in(ctx)
    if token is None:
        return  # OAuth card sent — resumes on the callback turn

    client = get_graph_client(token)
    user = await client.me.get()
    print(f"User ID: {user.id}")
    print(f"User Display Name: {user.display_name}")
    print(f"User Email: {user.mail}")
    print(f"User Job Title: {user.job_title}")
```

</TabItem>
</Tabs>

<!-- advanced-sections -->

N/A

<!-- additional-resources -->

N/A
