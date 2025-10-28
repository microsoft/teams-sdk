---
sidebar_position: 4
summary: How to implement user sign-in with OAuth in C# Teams SDK applications using the built-in signin method.
---

# Signing In

Prompting the user to sign in using an `OAuth` connection has
never been easier! Just use the `sign_in` method to send the request
and the listen to the `sign_in` event to handle the token result.

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    """Handle message activities using the new generated handler system."""
    ctx.logger.info("User requested sign-in.")
    if ctx.is_signed_in:
        await ctx.send("You are already signed in.")
    else:
        await ctx.sign_in()


@app.event("sign_in")
async def handle_sign_in(event: SignInEvent):
    """Handle sign-in events."""
    await event.activity_ctx.send("You are now signed in!")

```