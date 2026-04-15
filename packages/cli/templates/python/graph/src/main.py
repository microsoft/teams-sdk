"""
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
"""

import asyncio
import logging
import os

from microsoft_teams.api import MessageActivity
from microsoft_teams.apps import ActivityContext, App, SignInEvent

logger = logging.getLogger(__name__)

# Create app with OAuth connection
app = App(default_connection_name=os.getenv("CONNECTION_NAME", "graph"))


@app.on_message_pattern("signout")
async def handle_signout_command(ctx: ActivityContext[MessageActivity]):
    """Handle sign-out command."""
    if not ctx.is_signed_in:
        await ctx.send("ℹ️ You are not currently signed in.")
    else:
        await ctx.sign_out()
        await ctx.send("👋 You have been signed out successfully!")


@app.on_message_pattern("profile")
async def handle_profile_command(ctx: ActivityContext[MessageActivity]):
    """Handle profile command using Graph API with TokenProtocol pattern."""

    if not ctx.is_signed_in:
        await ctx.send("🔐 Please sign in first to access Microsoft Graph.")
        await ctx.sign_in()
        return

    graph = ctx.user_graph
    # Fetch user profile
    if graph:
        me = await graph.me.get()

    if me:
        profile_info = (
            f"👤 **Your Profile**\n\n"
            f"**Name:** {me.display_name or 'N/A'}\n\n"
            f"**Email:** {me.user_principal_name or 'N/A'}\n\n"
            f"**Job Title:** {me.job_title or 'N/A'}\n\n"
            f"**Department:** {me.department or 'N/A'}\n\n"
            f"**Office:** {me.office_location or 'N/A'}"
        )
        await ctx.send(profile_info)
    else:
        await ctx.send("❌ Could not retrieve your profile information.")


@app.on_message
async def handle_default_message(ctx: ActivityContext[MessageActivity]):
    """Handle default message - trigger signin."""
    if ctx.is_signed_in:
        await ctx.send(
            "✅ You are already signed in!\n\n"
            "You can now use these commands:\n\n"
            "• **profile** - View your profile\n\n"
            "• **signout** - Sign out when done"
        )
    else:
        await ctx.send("🔐 Please sign in to access Microsoft Graph...")
        await ctx.sign_in()


@app.event("sign_in")
async def handle_sign_in_event(event: SignInEvent):
    """Handle successful sign-in events."""
    await event.activity_ctx.send(
        "✅ **Successfully signed in!**\n\n"
        "You can now use these commands:\n\n"
        "• **profile** - View your profile\n\n"
        "• **signout** - Sign out when done"
    )


def main():
    asyncio.run(app.start())


if __name__ == "__main__":
    main()
