<!-- api-table -->

The following table shows common BotBuilder `TeamsInfo` methods and their equivalent Teams SDK `ApiClient` methods:

| BotBuilder (TeamsInfo) | Teams SDK (ApiClient) | Description |
|------------------------|----------------------|-------------|
| `TeamsInfo.getMembers(context)` | `api.conversations.members(conversationId).get()` | Get members of a conversation |
| `TeamsInfo.getTeamDetails(context, teamId)` | `api.teams(teamId).get()` | Get details of a team |
| `TeamsInfo.getTeamChannels(context, teamId)` | `api.teams(teamId).channels.get()` | Get channels in a team |
| `TeamsInfo.getTeamMember(context, teamId, userId)` | `api.teams(teamId).members(userId).get()` | Get a specific team member |
| `TeamsInfo.getMeetingParticipant(context, meetingId, participantId)` | `api.meetings(meetingId).participants(participantId).get()` | Get meeting participant details |
| `TeamsInfo.sendMessageToTeamsChannel(context, teamId, message)` | `api.conversations.create()` then `api.conversations(id).activities.create()` | Send message to a channel |

<!-- example -->

<Tabs groupId="api-client">
  <TabItem value="Diff" default>
  ```typescript
  // highlight-error-start
-  import {
-    CloudAdapter,
-    ConfigurationBotFrameworkAuthentication,
-    TeamsInfo,
-  } from 'botbuilder';
  // highlight-error-end
  // highlight-success-line
+  import { App } from '@microsoft/teams.apps';

  // highlight-error-start
-  const auth = new ConfigurationBotFrameworkAuthentication(process.env);
-  const adapter = new CloudAdapter(auth);
  // highlight-error-end
  // highlight-success-line
+  const app = new App();

  // highlight-error-start
-  export class ActivityHandler extends TeamsActivityHandler {
-    constructor() {
-      super();
-      this.onMessage(async (context) => {
-        const members = await TeamsInfo.getMembers(context);
-      });
-    }
-  }
  // highlight-error-end
  // highlight-success-start
+  app.on('message', async ({ api, activity }) => {
+    const members = await api.conversations.members(activity.conversation.id).get();
+  });
  // highlight-success-end
  ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```typescript showLineNumbers
    import {
      CloudAdapter,
      ConfigurationBotFrameworkAuthentication,
      TeamsInfo,
    } from 'botbuilder';

    const auth = new ConfigurationBotFrameworkAuthentication(process.env);
    const adapter = new CloudAdapter(auth);

    export class ActivityHandler extends TeamsActivityHandler {
      constructor() {
        super();
        this.onMessage(async (context) => {
          // highlight-next-line
          const members = await TeamsInfo.getMembers(context);
        });
      }
    }
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```typescript showLineNumbers
    import { App } from '@microsoft/teams.apps';

    const app = new App();

    app.on('message', async ({ api, activity }) => {
      // highlight-next-line
      const members = await api.conversations.members(activity.conversation.id).get();
    });
    ```
  </TabItem>
</Tabs>