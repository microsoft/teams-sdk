<!-- package-info -->

`microsoft-teams-graph` package

<!-- migration-note -->

N/A

<!-- package-overview -->

N/A

<!-- app-graph-object -->

`app.graph`

<!-- app-access-method -->

to call the endpoint of your choice

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

<!-- user-graph-object -->

`user_graph`

<!-- app-graph-in-handler -->

`app_graph`

<!-- app-graph-reference -->

`app.graph`

<!-- advanced-sections -->

N/A

<!-- additional-resources -->

N/A
