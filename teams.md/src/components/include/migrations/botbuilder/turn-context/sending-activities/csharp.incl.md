<!-- examples -->

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```csharp
    // highlight-error-start
-   using Microsoft.Bot.Builder;

-   public class MyActivityHandler : TeamsActivityHandler
-   {
-       protected override async Task OnMessageActivityAsync(
-           ITurnContext<IMessageActivity> turnContext,
-           CancellationToken cancellationToken)
-       {
-           await turnContext.SendActivityAsync(
-               MessageFactory.Text("typing"), 
-               cancellationToken: cancellationToken);
-       }
-   }
    // highlight-error-end
    // highlight-success-start
+   app.OnMessage(async (context) =>
+   {
+       await context.SendAsync(new Activity { Type = "typing" });
+   });
    // highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```csharp showLineNumbers
    using Microsoft.Bot.Builder;

    public class MyActivityHandler : TeamsActivityHandler
    {
        protected override async Task OnMessageActivityAsync(
            ITurnContext<IMessageActivity> turnContext,
            CancellationToken cancellationToken)
        {
            // highlight-next-line
            await turnContext.SendActivityAsync(
                MessageFactory.Text("typing"), 
                cancellationToken: cancellationToken);
        }
    }
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```csharp showLineNumbers
    app.OnMessage(async (context) =>
    {
        // highlight-next-line
        await context.SendAsync(new Activity { Type = "typing" });
    });
    ```
  </TabItem>
</Tabs>

## Strings

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```csharp
    // highlight-error-start
-   using Microsoft.Bot.Builder;

-   public class MyActivityHandler : TeamsActivityHandler
-   {
-       protected override async Task OnMessageActivityAsync(
-           ITurnContext<IMessageActivity> turnContext,
-           CancellationToken cancellationToken)
-       {
-           await turnContext.SendActivityAsync("hello world", cancellationToken: cancellationToken);
-       }
-   }
    // highlight-error-end
    // highlight-success-start
+   app.OnMessage(async (context) =>
+   {
+       await context.SendAsync("hello world");
+   });
    // highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```csharp showLineNumbers
    using Microsoft.Bot.Builder;

    public class MyActivityHandler : TeamsActivityHandler
    {
        protected override async Task OnMessageActivityAsync(
            ITurnContext<IMessageActivity> turnContext,
            CancellationToken cancellationToken)
        {
            // highlight-next-line
            await turnContext.SendActivityAsync("hello world", cancellationToken: cancellationToken);
        }
    }
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```csharp showLineNumbers
    app.OnMessage(async (context) =>
    {
        // highlight-next-line
        await context.SendAsync("hello world");
    });
    ```
  </TabItem>
</Tabs>

## Adaptive Cards

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```csharp
    // highlight-error-line
-   using Microsoft.Bot.Builder;
-   using Microsoft.Bot.Schema;
    // highlight-success-line
+   using Microsoft.Teams.Cards;

    // highlight-error-start
-   public class MyActivityHandler : TeamsActivityHandler
-   {
-       protected override async Task OnMessageActivityAsync(
-           ITurnContext<IMessageActivity> turnContext,
-           CancellationToken cancellationToken)
-       {
-           var card = new
-           {
-               type = "AdaptiveCard",
-               version = "1.0",
-               body = new[]
-               {
-                   new { type = "TextBlock", text = "hello world" }
-               }
-           };
-           var attachment = new Attachment
-           {
-               ContentType = "application/vnd.microsoft.card.adaptive",
-               Content = card
-           };
-           var activity = MessageFactory.Attachment(attachment);
-           await turnContext.SendActivityAsync(activity, cancellationToken: cancellationToken);
-       }
-   }
    // highlight-error-end
    // highlight-success-start
+   app.OnMessage(async (context) =>
+   {
+       await context.SendAsync(new AdaptiveCard(new TextBlock("hello world")));
+   });
    // highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```csharp showLineNumbers
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Schema;

    public class MyActivityHandler : TeamsActivityHandler
    {
        protected override async Task OnMessageActivityAsync(
            ITurnContext<IMessageActivity> turnContext,
            CancellationToken cancellationToken)
        {
            // highlight-start
            var card = new
            {
                type = "AdaptiveCard",
                version = "1.0",
                body = new[]
                {
                    new { type = "TextBlock", text = "hello world" }
                }
            };
            var attachment = new Attachment
            {
                ContentType = "application/vnd.microsoft.card.adaptive",
                Content = card
            };
            var activity = MessageFactory.Attachment(attachment);
            await turnContext.SendActivityAsync(activity, cancellationToken: cancellationToken);
            // highlight-end
        }
    }
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```csharp showLineNumbers
    using Microsoft.Teams.Cards;

    app.OnMessage(async (context) =>
    {
        // highlight-next-line
        await context.SendAsync(new AdaptiveCard(new TextBlock("hello world")));
    });
    ```
  </TabItem>
</Tabs>

## Attachments

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```csharp
    // highlight-error-line
-   using Microsoft.Bot.Builder;
-   using Microsoft.Bot.Schema;
    // highlight-success-line
+   using Microsoft.Teams.Schema;

    // highlight-error-start
-   public class MyActivityHandler : TeamsActivityHandler
-   {
-       protected override async Task OnMessageActivityAsync(
-           ITurnContext<IMessageActivity> turnContext,
-           CancellationToken cancellationToken)
-       {
-           var activity = MessageFactory.Attachment(new Attachment { /* ... */ });
-           await turnContext.SendActivityAsync(activity, cancellationToken: cancellationToken);
-       }
-   }
    // highlight-error-end
    // highlight-success-start
+   app.OnMessage(async (context) =>
+   {
+       var activity = new MessageActivity();
+       activity.AddAttachment(new Attachment { /* ... */ });
+       await context.SendAsync(activity);
+   });
    // highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```csharp showLineNumbers
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Schema;

    public class MyActivityHandler : TeamsActivityHandler
    {
        protected override async Task OnMessageActivityAsync(
            ITurnContext<IMessageActivity> turnContext,
            CancellationToken cancellationToken)
        {
            // highlight-start
            var activity = MessageFactory.Attachment(new Attachment { /* ... */ });
            await turnContext.SendActivityAsync(activity, cancellationToken: cancellationToken);
            // highlight-end
        }
    }
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```csharp showLineNumbers
    using Microsoft.Teams.Schema;

    app.OnMessage(async (context) =>
    {
        // highlight-start
        var activity = new MessageActivity();
        activity.AddAttachment(new Attachment { /* ... */ });
        await context.SendAsync(activity);
        // highlight-end
    });
    ```
  </TabItem>
</Tabs>
