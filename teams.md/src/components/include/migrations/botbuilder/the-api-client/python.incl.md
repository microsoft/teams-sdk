<!-- example -->

<Tabs groupId="api-client">
  <TabItem value="Diff" default>
  ```python
  # highlight-error-start
-  from botbuilder.core import ActivityHandler, TurnContext
-  from botbuilder.core.teams import TeamsInfo
  # highlight-error-end
  # highlight-success-line
+  from microsoft_teams.apps import ActivityContext
+  from microsoft_teams.api import MessageActivity

  # highlight-error-start
-  class MyActivityHandler(ActivityHandler):
-      async def on_message_activity(self, turn_context: TurnContext):
-          members = await TeamsInfo.get_members(turn_context)
  # highlight-error-end
  # highlight-success-start
+  @app.on_message
+  async def on_message(context: ActivityContext[MessageActivity]):
+      members = await context.api.conversations.members(context.activity.conversation.id).get_all()
  # highlight-success-end
  ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```python showLineNumbers
    from botbuilder.core import ActivityHandler, TurnContext
    from botbuilder.core.teams import TeamsInfo

    class MyActivityHandler(ActivityHandler):
        async def on_message_activity(self, turn_context: TurnContext):
            # highlight-next-line
            members = await TeamsInfo.get_members(turn_context)
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```python showLineNumbers
    from microsoft_teams.api import MessageActivity
    from microsoft_teams.apps import ActivityContext

    @app.on_message
    async def on_message(context: ActivityContext[MessageActivity]):
        # highlight-next-line
        members = await context.api.conversations.members(context.activity.conversation.id).get()
    ```
  </TabItem>
</Tabs>

<!-- api-table -->

| BotBuilder (TeamsInfo) | Teams SDK (ApiClient) |
|------------------------|----------------------|
| `TeamsInfo.getMembers(context, user_id)` | `api.conversations.members.get_by_id(conversation_id, user_id)` |
| `TeamsInfo.get_team_details(context, team_id)` | `api.teams.get_by_id(team_id)` |
| `TeamsInfo.get_meeting_info(context, meeting_id)` | `api.meetings.get_by_id(meeting_id)` |
| `TeamsInfo.send_message_to_teams_channel(context, team_id, message)` | `api.conversations.create()` then `api.conversations.activities.create(conversation_id, activity)` |
