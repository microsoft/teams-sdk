<!-- content -->

BotBuilder exposes a static class `TeamsInfo` that allows you to query the api. In Teams SDK
we pass an instance of our `ApiClient` into all our activity handlers.

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
  ```csharp
  // highlight-error-start
-  using Microsoft.Bot.Builder;
-  using Microsoft.Bot.Builder.Teams;
  // highlight-error-end
  // highlight-success-line
+  using Microsoft.Teams.Apps;

  // highlight-error-start
-  var auth = new ConfigurationBotFrameworkAuthentication(configuration);
-  var adapter = new CloudAdapter(auth);
  // highlight-error-end
  // highlight-success-line
+  var app = new TeamsApp();

  // highlight-error-start
-  public class MyActivityHandler : TeamsActivityHandler
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
+  app.OnMessage(async (context) =>
+  {
+      var members = await context.Api.Conversations.Members(context.Activity.Conversation.Id).GetAsync();
+  });
  // highlight-success-end
  ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```csharp showLineNumbers
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Builder.Teams;

    var auth = new ConfigurationBotFrameworkAuthentication(configuration);
    var adapter = new CloudAdapter(auth);

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

    var app = new TeamsApp();

    app.OnMessage(async (context) =>
    {
        // highlight-next-line
        var members = await context.Api.Conversations.Members(context.Activity.Conversation.Id).GetAsync();
    });
    ```
  </TabItem>
</Tabs>
