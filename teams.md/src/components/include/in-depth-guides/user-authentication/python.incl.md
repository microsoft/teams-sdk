<!-- create-project -->

Use your terminal to run the following command:

```sh
npx @microsoft/teams.cli@latest new python oauth-app --template graph
```

This command:

1. Creates a new directory called `oauth-app`.
2. Bootstraps the graph agent template files into it under `oauth-app/src`.
3. Creates your agent's manifest files, including a `manifest.json` file and placeholder icons in the `oauth-app/appPackage` directory.

<!-- configure-oauth -->

```python
from teams import App
from teams.api import MessageActivity, SignInEvent
from teams.apps import ActivityContext
from teams.logger import ConsoleLogger, ConsoleLoggerOptions

app = App(
    # The name of the auth connection to use.
    # It should be the same as the Oauth connection name defined in the Azure Bot configuration.
    default_connection_name="graph",
    logger=ConsoleLogger().create_logger("auth", options=ConsoleLoggerOptions(level="debug")))
```

<!-- signing-in -->

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

<!-- signin-event -->

```python
@app.event("sign_in")
async def handle_sign_in(event: SignInEvent):
    """Handle sign-in events."""
    await event.activity_ctx.send("You are now signed in!")
```

<!-- using-graph -->

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

@app.on_message
async def handle_all_messages(ctx: ActivityContext[MessageActivity]):
    """Handle all other messages."""
    if ctx.is_signed_in:
        await ctx.send(f'You said: "{ctx.activity.text}". Please type **/whoami** to see your profile or **/signout** to sign out.')
    else:
        await ctx.send(f'You said: "{ctx.activity.text}". Please type **/signin** to sign in.')
```

<!-- signing-out -->

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

<!-- regional-bot -->
## Regional Configs

To properly configure your regional bot, you will need to make a few updates. This example uses West Europe, but follow the equivalent for other regions.

1. In `azurebot.bicep`, replace all `global` occurrences to `westeurope`
2. In `manifest.json`, in `validDomains`, `*.botframework.com` should be replaced by `europe.token.botframework.com`
3. In `aad.manifest.json`, replace `https://token.botframework.com/.auth/web/redirect` with `https://europe.token.botframework.com/.auth/web/redirect`
4. You will also need to update the setup of your App instance to add in your Oauth URL.

```python
app = App(
    default_connection_name='graph',
    api_client_settings=ApiClientSettings(
        oauth_url="https://europe.token.botframework.com"
    )
)
```