<!-- migration-note -->

N/A

<!-- package-overview -->

N/A

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

You can also access the graph using the user's token from within a message handler via the `user_graph` property.

<!-- user-graph-example -->

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

<!-- advanced-sections -->

N/A

<!-- additional-resources -->

N/A
