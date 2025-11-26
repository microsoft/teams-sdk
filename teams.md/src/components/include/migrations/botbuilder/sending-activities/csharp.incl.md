<!-- examples -->

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```csharp
    // highlight-error-start
-   using Microsoft.Bot.Builder;
-   using Microsoft.Bot.Schema;
    // highlight-error-end
    // highlight-success-start
+   using Microsoft.Teams.Apps;
+   using Microsoft.Teams.Plugins.AspNetCore.Extensions;
+   using Microsoft.Teams.Api.Activities;
    //highlight-success-end

    // highlight-error-start
-   public class MyActivityHandler : ActivityHandler
-   {
-       protected override async Task OnMessageActivityAsync(
-           ITurnContext<IMessageActivity> turnContext,
-           CancellationToken cancellationToken)
-       {
-           await turnContext.SendActivityAsync(
-               Activity.CreateTypingActivity(), 
-               cancellationToken: cancellationToken);
-       }
-   }
    // highlight-error-end
    // highlight-success-start
+   var teams = app.UseTeams();
+   teams.OnMessage(async (context) =>
+   {
+       await context.Send(new Activity(type:"typing"));
+   });
    // highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```csharp showLineNumbers
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Schema;

    public class MyActivityHandler : ActivityHandler
    {
        protected override async Task OnMessageActivityAsync(
            ITurnContext<IMessageActivity> turnContext,
            CancellationToken cancellationToken)
        {
            // highlight-next-line
            await turnContext.SendActivityAsync(
                Activity.CreateTypingActivity(), 
                cancellationToken: cancellationToken);
        }
    }
    ```
  </TabItem>
  <TabItem value="Teams SDK">
    ```csharp showLineNumbers
    using Microsoft.Teams.Apps;
    using Microsoft.Teams.Plugins.AspNetCore.Extensions;
    using Microsoft.Teams.Api.Activities;

    var teams = app.UseTeams();
    teams.OnMessage(async (context) =>
    {
        // highlight-next-line
        await context.Send(new Activity(type:"typing"));
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
-   using Microsoft.Bot.Schema;
    // highlight-error-end
    // highlight-success-start
+   using Microsoft.Teams.Apps;
+   using Microsoft.Teams.Plugins.AspNetCore.Extensions;
    //highlight-success-end

    // highlight-error-start
-   public class MyActivityHandler : ActivityHandler
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
+   var teams = app.UseTeams();
+   teams.OnMessage(async (context) =>
+   {
+       await context.Send("hello world");
+   });
    // highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```csharp showLineNumbers
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Schema;

    public class MyActivityHandler : ActivityHandler
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
    using Microsoft.Teams.Apps;
    using Microsoft.Teams.Plugins.AspNetCore.Extensions;

    var teams = app.UseTeams();
    teams.OnMessage(async (context) =>
    {
        // highlight-next-line
        await context.Send("hello world");
    });
    ```
  </TabItem>
</Tabs>

## Adaptive Cards

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```csharp
    // highlight-error-start
-   using Microsoft.Bot.Builder;
-   using Microsoft.Bot.Schema;
    // highlight-error-end
    // highlight-success-start
+   using Microsoft.Teams.Apps;
+   using Microsoft.Teams.Cards;
+   using Microsoft.Teams.Plugins.AspNetCore.Extensions;
    // highlight-success-end

    // highlight-error-start
-   public class MyActivityHandler : ActivityHandler
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
+   var teams = app.UseTeams();
+   teams.OnMessage(async (context) =>
+   {
+       await context.Send(new AdaptiveCard(new TextBlock("hello world")));
+   });
    // highlight-success-end
    ```
  </TabItem>
  <TabItem value="BotBuilder">
    ```csharp showLineNumbers
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Schema;

    public class MyActivityHandler : ActivityHandler
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
    using Microsoft.Teams.Apps;
    using Microsoft.Teams.Plugins.AspNetCore.Extensions;

    var teams = app.UseTeams();
    teams.OnMessage(async (context) =>
    {
        // highlight-next-line
        await context.Send(new AdaptiveCard(new TextBlock("hello world")));
    });
    ```
  </TabItem>
</Tabs>

## Attachments

<Tabs groupId="sending-activities">
  <TabItem value="Diff" default>
    ```csharp
    // highlight-error-start
-   using Microsoft.Bot.Builder;
-   using Microsoft.Bot.Schema;
    // highlight-error-end
    // highlight-success-start
+   using Microsoft.Teams.Apps;
+   using Microsoft.Teams.Api;
+   using Microsoft.Teams.Plugins.AspNetCore.Extensions;
    // highlight-success-end

    // highlight-error-start
-   public class MyActivityHandler : ActivityHandler
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
+   var teams = app.UseTeams();
+   teams.OnMessage(async (context) =>
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

    public class MyActivityHandler : ActivityHandler
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
    using Microsoft.Teams.Api;
    using Microsoft.Teams.Apps;
    using Microsoft.Teams.Plugins.AspNetCore.Extensions;
    
    var teams = app.UseTeams();
    teams.OnMessage(async (context) =>
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
