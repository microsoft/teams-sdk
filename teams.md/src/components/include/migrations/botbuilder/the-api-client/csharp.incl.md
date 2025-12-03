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

- public class MyActivityHandler : ActivityHandler
- {
-      protected override async Task OnMessageActivityAsync(
-          ITurnContext<IMessageActivity> turnContext,
-          CancellationToken cancellationToken)
-      {
-          var members = await TeamsInfo.GetMembersAsync(turnContext, cancellationToken);
-      }
- }
  // highlight-error-end
  // highlight-success-start

* var teams = app.UseTeams();
* teams.OnMessage(async (context) =>
* {
*      var members = await context.Api.Conversations.Members.GetAsync(context.Activity.Conversation.Id);
* });
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

<!-- api-table -->

| BotBuilder (TeamsInfo) | Teams SDK (ApiClient) |
|------------------------|----------------------|
| `TeamsInfo.GetMemberAsync(context, userId)` | `Api.Conversations.Members.GetByIdAsync(conversationId, userId)` |
| `TeamsInfo.GetTeamDetailsAsync(context, teamId)` | `Api.Teams.GetByIdAsync(teamId)` |
| `TeamsInfo.GetMeetingInfoAsync(context, meetingId)` | `Api.Meetings.GetByIdAsync(meetingId)` |
| `TeamsInfo.SendMessageToTeamsChannelAsync(context, teamId, message)` | `Api.Conversations.CreateAsync(CreateRequest)` then `Api.Conversations.Activities.CreateAsync(conversationId, activity)` |
