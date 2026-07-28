<!-- adding-reaction -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">
    ```csharp
    using Microsoft.Teams.Apps.Annotations;

    [TeamsController]
    public class MessageController
    {
        [Message]
        public async Task OnMessage([Context] IContext context, CancellationToken cancellationToken)
        {
            await context.Client.Send("Hello! I'll react to your message.");

            await context.Api.Conversations.Reactions.AddAsync(
                context.Activity.Conversation.Id,
                context.Activity.Id,
                ReactionType.Like,
                cancellationToken
            );
        }
    }
    ```
  </TabItem>
  <TabItem value="core" label="SDK 2.1 (Preview)">
    ```csharp
    using Microsoft.Teams.Apps;

    app.OnMessage(async (context, cancellationToken) =>
    {
        await context.SendAsync("Hello! I'll react to your message.", cancellationToken);

        // Add a reaction to the incoming message
        await context.Api.Conversations.AddReactionAsync(
            context.Activity.Conversation.Id,
            context.Activity.Id,
            ReactionType.Like,
            cancellationToken: cancellationToken
        );
    });
    ```
  </TabItem>
</Tabs>

<!-- removing-reaction -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">
    ```csharp
    using Microsoft.Teams.Apps.Annotations;

    [TeamsController]
    public class MessageController
    {
        [Message]
        public async Task OnMessage([Context] IContext context, CancellationToken cancellationToken)
        {
            // First, add a reaction
            await context.Api.Conversations.Reactions.AddAsync(
                context.Activity.Conversation.Id,
                context.Activity.Id,
                ReactionType.Heart,
                cancellationToken
            );

            // Wait a bit, then remove it
            await Task.Delay(2000, cancellationToken);
            await context.Api.Conversations.Reactions.DeleteAsync(
                context.Activity.Conversation.Id,
                context.Activity.Id,
                ReactionType.Heart,
                cancellationToken
            );
        }
    }
    ```
  </TabItem>
  <TabItem value="core" label="SDK 2.1 (Preview)">
    ```csharp
    using Microsoft.Teams.Apps;

    app.OnMessage(async (context, cancellationToken) =>
    {
        // First, add a reaction
        await context.Api.Conversations.AddReactionAsync(
            context.Activity.Conversation.Id,
            context.Activity.Id,
            ReactionType.Heart,
            cancellationToken: cancellationToken
        );

        // Wait a bit, then remove it
        await Task.Delay(2000, cancellationToken);
        await context.Api.Conversations.DeleteReactionAsync(
            context.Activity.Conversation.Id,
            context.Activity.Id,
            ReactionType.Heart,
            cancellationToken: cancellationToken
        );
    });
    ```
  </TabItem>
</Tabs>

<!-- reaction-types -->

- `ReactionType.Like` — 👍
- `ReactionType.Heart` — ❤️
- `ReactionType.Checkmark` — ✅
- `ReactionType.Pushpin` — 📌
- `ReactionType.Laugh` — 😄
- `ReactionType.Surprise` — 😮
- `ReactionType.Sad` — 😢
- `ReactionType.Angry` — 😠
- `ReactionType.Hourglass` — ⏳
- `ReactionType.Exclamation` — ❗

<!-- receiving-reactions -->

.NET exposes a single `OnMessageReaction` handler plus dedicated `OnMessageReactionAdded` / `OnMessageReactionRemoved` sub-handlers.

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">
    ```csharp
    using Microsoft.Teams.Apps.Annotations;

    [TeamsController]
    public class ReactionController
    {
        [Message.Reaction]
        public void OnMessageReaction([Context] IContext context)
        {
            foreach (var reaction in context.Activity.ReactionsAdded ?? [])
            {
                Console.WriteLine($"User added reaction: {reaction.Type}");
            }

            foreach (var reaction in context.Activity.ReactionsRemoved ?? [])
            {
                Console.WriteLine($"User removed reaction: {reaction.Type}");
            }
        }
    }
    ```
  </TabItem>
  <TabItem value="core" label="SDK 2.1 (Preview)">
    ```csharp
    using Microsoft.Teams.Apps;

    app.OnMessageReactionAdded(async (context, cancellationToken) =>
    {
        foreach (var reaction in context.Activity.ReactionsAdded ?? [])
        {
            Console.WriteLine($"User added reaction: {reaction.Type}");
        }
    });

    app.OnMessageReactionRemoved(async (context, cancellationToken) =>
    {
        foreach (var reaction in context.Activity.ReactionsRemoved ?? [])
        {
            Console.WriteLine($"User removed reaction: {reaction.Type}");
        }
    });
    ```
  </TabItem>
</Tabs>

If you only need a single handler that runs for both adds and removes, use `app.OnMessageReaction` instead.
