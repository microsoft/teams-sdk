<!-- create-project -->
## Project Setup

:::tip
If you're creating a new app, use the `graph` template. Skip this if you're adding auth to an existing app.
:::

Use your terminal to run the following command:

```sh
teams project new python oauth-app --template graph
```

This command:

1. Creates a new directory called `oauth-app`.
2. Bootstraps the graph agent template files into it under `oauth-app/src`.

<!-- configure-oauth -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="python-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```python
from microsoft_teams.apps import App

app = App(
    # The name of the auth connection to use.
    # It should be the same as the OAuth connection name defined in the Azure Bot configuration.
    default_connection_name="graph",
)
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

Register the connections you plan to use. `add_oauth_flow` returns the object that owns one.

```python
from microsoft_teams.apps import App

app = App()

graph = app.add_oauth_flow(
    "graph",
    oauth_card_text="Sign in to your account",
    sign_in_button_text="Sign in",
)
```

Both card options are optional. Use `app.get_oauth_flow("graph")` to get the flow again from another module.

:::note
Registering a flow enables per-turn state unless you set `state` yourself, so sign-in callbacks that don't name a connection can be traced back to the one that started them.
:::

  </TabItem>
</Tabs>

<!-- signing-in -->

:::note
This uses the Single Sign-On (SSO) authentication flow. To learn more about all the available flows and their differences see the [official documentation](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-authentication?view=azure-bot-service-4.0).
:::

<Tabs groupId="python-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```python
@app.on_message
async def handle_signin_message(ctx: ActivityContext[MessageActivity]):
    """Handle message activities for signing in."""
    ctx.logger.info("User requested sign-in.")
    if ctx.is_signed_in:
        await ctx.send("You are already signed in.")
    else:
        await ctx.sign_in()
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

```python
@app.on_message_pattern("/signin")
async def handle_signin_message(ctx: ActivityContext[MessageActivity]):
    """Handle message activities for signing in."""
    token = await graph.sign_in(ctx)
    if token:
        await ctx.send("You are already signed in.")
```

  </TabItem>
</Tabs>

<!-- signin-event -->

<Tabs groupId="python-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```python
@app.event("sign_in")
async def handle_sign_in(event: SignInEvent):
    """Handle sign-in events."""
    await event.activity_ctx.send("You are now signed in!")
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

The handler is scoped to its connection, so there's no need to branch on the connection name.

```python
@graph.on_signin
async def on_graph_signin(event: SignInEvent):
    """Only fires for the `graph` connection."""
    await event.activity_ctx.send(
        f"Signed in on {event.connection_name}. "
        "Type **/whoami** to see your profile or **/signout** to sign out."
    )
```

:::note
A flow can have more than one handler. They run in registration order and are isolated — if one raises, the error is logged and the rest still run. The app-wide `sign_in` event also still fires for every connection.
:::

  </TabItem>
</Tabs>

<!-- using-graph -->

From this point, you can query graph for the signed-in user, for example to reply to the `/whoami` message, or in any other route.

<Tabs groupId="python-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

Use the `is_signed_in` flag and the `user_graph` client.

```python
@app.on_message
async def handle_whoami_message(ctx: ActivityContext[MessageActivity]):
    """Handle messages to show user information from Microsoft Graph."""
    if not ctx.is_signed_in:
        await ctx.send("You are not signed in! Please sign in to continue.")
        return

    # Access user's Microsoft Graph data
    me = await ctx.user_graph.me.get()
    await ctx.send(f"Hello {me.display_name}! Your email is {me.mail or me.user_principal_name}")
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

Build the client from the flow's token, so it always talks to the connection that owns it.

```python
from microsoft_teams.graph import get_graph_client

@app.on_message_pattern("/whoami")
async def handle_whoami_message(ctx: ActivityContext[MessageActivity]):
    """Handle messages to show user information from Microsoft Graph."""
    token = await graph.sign_in(ctx)
    if token is None:
        return  # OAuth card sent — resumes on the callback turn

    client = get_graph_client(token)
    me = await client.me.get()
    await ctx.send(f"Hello {me.display_name}! Your email is {me.mail or me.user_principal_name}")
```

  </TabItem>
</Tabs>

<!-- signing-out -->

<Tabs groupId="python-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```python
@app.on_message
async def handle_signout_message(ctx: ActivityContext[MessageActivity]):
    """Handle sign out requests."""
    if not ctx.is_signed_in:
        await ctx.send("You are not signed in!")
        return

    await ctx.sign_out()
    await ctx.send("You have been signed out!")
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

```python
@app.on_message_pattern("/signout")
async def handle_signout_message(ctx: ActivityContext[MessageActivity]):
    """Handle sign out requests."""
    await graph.sign_out(ctx)
    await ctx.send("You have been signed out!")
```

  </TabItem>
</Tabs>

<!-- multiple-connections -->

```python
app = App()

graph = app.add_oauth_flow("graph", oauth_card_text="Sign in with Microsoft")
github = app.add_oauth_flow("github", oauth_card_text="Sign in with GitHub")

@app.on_message_pattern("/graph")
async def handle_graph(ctx: ActivityContext[MessageActivity]):
    token = await graph.sign_in(ctx)
    if token:
        await send_graph_profile(ctx, token)

@app.on_message_pattern("/github")
async def handle_github(ctx: ActivityContext[MessageActivity]):
    token = await github.sign_in(ctx)
    if token:
        await send_github_profile(ctx, token)

@graph.on_signin
async def on_graph_signin(event: SignInEvent):
    await send_graph_profile(event.activity_ctx, event.token_response.token)

@github.on_signin
async def on_github_signin(event: SignInEvent):
    await send_github_profile(event.activity_ctx, event.token_response.token)

@app.on_message_pattern("/signout github")
async def handle_signout_github(ctx: ActivityContext[MessageActivity]):
    await github.sign_out(ctx)
    await ctx.send("Signed out of GitHub.")
```

Signing out of one connection leaves the other signed in.

<!-- connection-status -->

```python
@app.on_message_pattern("/status")
async def handle_status(ctx: ActivityContext[MessageActivity]):
    statuses = await ctx.get_connection_status()
    lines = [
        f"- `{status.connection_name}`: {'signed in' if status.has_token else 'signed out'}"
        for status in statuses
    ]
    await ctx.send("\n".join(lines))
```

<!-- pending-messages -->

<Tabs groupId="python-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```python
from microsoft_teams.apps import App, ActivityContext, SignInEvent
from microsoft_teams.apps.routing import SignInOptions
from microsoft_teams.api import MessageActivity

app = App()

pending_messages: dict[str, str] = {}

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    # sign_in() returns the token if already signed in, or None if OAuth card was sent
    token = await ctx.sign_in(SignInOptions(
        oauth_card_text="To help with that, I need to sign you in first."
    ))

    if token is None:
        # OAuth card sent — store the original message for later
        pending_messages[ctx.activity.from_.id] = ctx.activity.text
        return

    # User is already signed in — process normally
    await process_message(ctx.activity.text, ctx)

@app.event("sign_in")
async def handle_sign_in(event: SignInEvent):
    user_id = event.activity_ctx.activity.from_.id
    pending = pending_messages.pop(user_id, None)

    if pending:
        await event.activity_ctx.send("Successfully signed in! Processing your original request...")
        await process_message(pending, event.activity_ctx)
    else:
        await event.activity_ctx.send("You are now signed in!")
```

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

```python
from microsoft_teams.apps import App, ActivityContext, SignInEvent
from microsoft_teams.apps.routing import SignInOptions
from microsoft_teams.api import MessageActivity

app = App()
graph = app.add_oauth_flow("graph")

pending_messages: dict[str, str] = {}

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    # sign_in() returns the token if already signed in, or None if an OAuth card was sent
    token = await graph.sign_in(ctx, SignInOptions(
        oauth_card_text="To help with that, I need to sign you in first."
    ))

    if token is None:
        pending_messages[ctx.activity.from_.id] = ctx.activity.text
        return

    await process_message(ctx.activity.text, ctx, token)

@graph.on_signin
async def on_graph_signin(event: SignInEvent):
    user_id = event.activity_ctx.activity.from_.id
    pending = pending_messages.pop(user_id, None)

    if pending:
        await event.activity_ctx.send("Successfully signed in! Processing your original request...")
        await process_message(pending, event.activity_ctx, event.token_response.token)
    else:
        await event.activity_ctx.send("You are now signed in!")
```

  </TabItem>
</Tabs>

<!-- signin-failure -->

<Tabs groupId="python-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.1 (Legacy)">

```python
@app.on_signin_failure()
async def handle_signin_failure(ctx):
    failure = ctx.activity.value
    print(f"Sign-in failed: {failure.code} - {failure.message}")
    await ctx.send("Sign-in failed.")
```

:::note
Registering a custom handler does **not** replace the built-in default handler. Both will run as part of the middleware chain.
:::

  </TabItem>
  <TabItem value="core" label="SDK 2.2 (current)" default>

```python
from microsoft_teams.apps import SignInFailureEvent

@graph.on_signin_failure
async def on_graph_signin_failure(event: SignInFailureEvent):
    ctx = event.activity_ctx
    ctx.logger.error(f"Graph sign-in failed: {event.code} - {event.message}")
    await ctx.send("Graph sign-in failed.")
```

A flow can have more than one failure handler; they run in registration order and are isolated from each other.

  </TabItem>
</Tabs>

<!-- regional-bot -->

## Regional Configs
You may be building a regional bot that is deployed in a specific Azure region (such as West Europe, East US, etc.) rather than global. This is important for organizations that have data residency requirements or want to reduce latency by keeping data and authentication flows within a specific area.

These examples use West Europe, but follow the equivalent for other regions.

<Tabs>
<TabItem value="portal" label="Azure Portal">
To configure a new regional bot in Azure, you must setup your resoures in the desired region. Your resource group must also be in the same region. 

1. Deploy a new App Registration in `westeurope`.
2. Deploy and link a new Enterprise Application (Service Principal) on Microsoft Entra in `westeurope`.
3. Deploy and link a new Azure Bot in `westeurope`.
4. In your App Registration, in the `Authentication (Preview)` tab, add a `Redirect URI` for the Platform Type `Web` to your regional endpoint (e.g., `https://europe.token.botframework.com/.auth/web/redirect`)

![Authentication Tab](/screenshots/regional-auth.png)

5. In your `.env` file (or wherever you set your environment variables), add your `OAUTH_URL`. For example:
`OAUTH_URL=https://europe.token.botframework.com`
</TabItem>

<TabItem value="atk" label="Agents Toolkit">
To configure a new regional bot with ATK, you will need to make a few updates. Note that this assumes you have not yet deployed the bot previously.

1. In `azurebot.bicep`, replace all `global` occurrences to `westeurope`
2. In `manifest.json`, in `validDomains`, `*.botframework.com` should be replaced by `europe.token.botframework.com`
3. In `aad.manifest.json`, replace `https://token.botframework.com/.auth/web/redirect` with `https://europe.token.botframework.com/.auth/web/redirect`
4. In your `.env` file, add your `OAUTH_URL`. For example:
`OAUTH_URL=https://europe.token.botframework.com`.
</TabItem>
</Tabs>