<!-- api-table -->

The following table shows common BotBuilder `TeamsInfo` methods and their equivalent Teams SDK `ApiClient` methods:

| BotBuilder (TeamsInfo) | Teams SDK (ApiClient) | Description |
|------------------------|----------------------|-------------|
| `TeamsInfo.get_members(context)` | `context.api.conversations.members(conversation_id).get()` | Get members of a conversation |
| `TeamsInfo.get_team_details(context, team_id)` | `context.api.teams(team_id).get()` | Get details of a team |
| `TeamsInfo.get_team_channels(context, team_id)` | `context.api.teams(team_id).channels.get()` | Get channels in a team |
| `TeamsInfo.get_team_member(context, team_id, user_id)` | `context.api.teams(team_id).members(user_id).get()` | Get a specific team member |
| `TeamsInfo.get_meeting_participant(context, meeting_id, participant_id)` | `context.api.meetings(meeting_id).participants(participant_id).get()` | Get meeting participant details |
| `TeamsInfo.send_message_to_teams_channel(context, team_id, message)` | `context.api.conversations.create()` then `context.api.conversations(id).activities.create()` | Send message to a channel |

<!-- example -->

<Tabs groupId="api-client">
  <TabItem value="Diff" default>
  ```python
  # highlight-error-start
-  from botbuilder.core import ActivityHandler, TurnContext
-  from botbuilder.core.teams import TeamsInfo
  # highlight-error-end
  # highlight-success-line
+  from microsoft.teams.apps import ActivityContext
+  from microsoft.teams.api import MessageActivity

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
    from microsoft.teams.api import MessageActivity
    from microsoft.teams.apps import ActivityContext

    @app.on_message
    async def on_message(context: ActivityContext[MessageActivity]):
        # highlight-next-line
        members = await context.api.conversations.members(context.activity.conversation.id).get()
    ```
  </TabItem>
</Tabs>
