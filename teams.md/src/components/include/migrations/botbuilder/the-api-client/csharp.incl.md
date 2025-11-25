<!-- api-table -->

The following table shows common BotBuilder `TeamsInfo` methods and their equivalent Teams SDK `ApiClient` methods:

| BotBuilder (TeamsInfo) | Teams SDK (ApiClient) | Description |
|------------------------|----------------------|-------------|
| `TeamsInfo.GetMembersAsync(context)` | `context.Api.Conversations.Members.GetAsync(conversationId)` | Get members of a conversation |
| `TeamsInfo.GetTeamDetailsAsync(context, teamId)` | `context.Api.Teams(teamId).GetAsync()` | Get details of a team |
| `TeamsInfo.GetTeamChannelsAsync(context, teamId)` | `context.Api.Teams(teamId).Channels.GetAsync()` | Get channels in a team |
| `TeamsInfo.GetTeamMemberAsync(context, teamId, userId)` | `context.Api.Teams(teamId).Members(userId).GetAsync()` | Get a specific team member |
| `TeamsInfo.GetMeetingParticipantAsync(context, meetingId, participantId)` | `context.Api.Meetings(meetingId).Participants(participantId).GetAsync()` | Get meeting participant details |
| `TeamsInfo.SendMessageToTeamsChannelAsync(context, teamId, message)` | `context.Api.Conversations.CreateAsync()` then `context.Api.Conversations(id).Activities.CreateAsync()` | Send message to a channel |

<!-- example -->

<Tabs groupId="api-client">
  <TabItem value="Diff" default>
  ```csharp
  // highlight-error-start
-  using Microsoft.Bot.Builder;
-  using Microsoft.Bot.Builder.Teams;
  // highlight-error-end
  // highlight-success-line
+  using Microsoft.Teams.Apps;

  // highlight-error-start
-  public class MyActivityHandler : ActivityHandler
-  {
-      protected override async Task OnMessageActivityAsync(
-          ITurnContext<IMessageActivity> turnContext,
-          CancellationToken cancellationToken)
-      {
-          var members = await TeamsInfo.GetMembersAsync(turnContext, cancellationToken);
-      }
-  }
  // highlight-error-end
  // highlight-success-start
+  var teams = app.UseTeams();
+  teams.OnMessage(async (context) =>
+  {
+      var members = await context.Api.Conversations.Members.GetAsync(context.Activity.Conversation.Id);
+  });
  // highlight-success-end
  ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```csharp showLineNumbers
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Builder.Teams;

    public class MyActivityHandler : TeamsActivityHandler
    {
        protected override async Task OnMessageActivityAsync(
            ITurnContext<IMessageActivity> turnContext,
            CancellationToken cancellationToken)
        {
            // highlight-next-line
            var members = await TeamsInfo.GetMembersAsync(turnContext, cancellationToken);
        }
    }
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```csharp showLineNumbers
    using Microsoft.Teams.Apps;
    
    app.OnMessage(async (context) =>
    {
        // highlight-next-line
        var members = await context.Api.Conversations.Members.GetAsync(context.Activity.Conversation.Id);
    });
    ```
  </TabItem>
</Tabs>
