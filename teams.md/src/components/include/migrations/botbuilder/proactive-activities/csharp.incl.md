<!-- example -->

<Tabs groupId="proactive-activities">
  <TabItem value="Diff" default>
    ```csharp
    // highlight-error-start
-   using Microsoft.Bot.Builder;
-   using Microsoft.Bot.Builder.Integration.AspNet.Core;
-   using Microsoft.Bot.Schema;
    // highlight-error-end
    // highlight-success-line
+   using Microsoft.Teams.Apps;

    // highlight-error-start

- var conversationReference = new ConversationReference
- {
-       ServiceUrl = "...",
-       Bot = new ChannelAccount { ... },
-       ChannelId = "msteams",
-       Conversation = new ConversationAccount { ... },
-       User = new ChannelAccount { ... }
- };
-
- await adapter.ContinueConversationAsync(
-       configuration["MicrosoftAppId"],
-       conversationReference,
-       async (turnContext, cancellationToken) =>
-       {
-           await turnContext.SendActivityAsync("proactive hello", cancellationToken: cancellationToken);
-       },
-       default);
  // highlight-error-end
  // highlight-success-start

* var teams = app.UseTeams();
* await teams.Send("your-conversation-id", "proactive hello");
  // highlight-success-end
  `   </TabItem>
  <TabItem value="BotBuilder">
    `csharp showLineNumbers
  using Microsoft.Bot.Builder;
  using Microsoft.Bot.Builder.Integration.AspNet.Core;
  using Microsoft.Bot.Schema;

      // highlight-start
      var conversationReference = new ConversationReference
      {
          ServiceUrl = "...",
          Bot = new ChannelAccount { ... },
          ChannelId = "msteams",
          Conversation = new ConversationAccount { ... },
          User = new ChannelAccount { ... }
      };

      await adapter.ContinueConversationAsync(
          configuration["MicrosoftAppId"],
          conversationReference,
          async (turnContext, cancellationToken) =>
          {
              await turnContext.SendActivityAsync("proactive hello", cancellationToken: cancellationToken);
          },
          default);
      // highlight-end
      ```

    </TabItem>
    <TabItem value="Teams SDK">
      ```csharp showLineNumbers
      using Microsoft.Teams.Apps;

      // highlight-start
      var teams = app.UseTeams();
      await teams.Send("your-conversation-id", "proactive hello");
      // highlight-end
      ```

    </TabItem>
  </Tabs>
