<!-- streaming -->

```csharp
TeamsStreamingWriter writer = TeamsStreamingWriter.CreateFromContext(context);
await writer.SendInformativeUpdateAsync("Thinking…", cancellationToken);

await foreach (ChatResponseUpdate update in _chatClient.GetStreamingResponseAsync(history, options, cancellationToken))
{
    if (!string.IsNullOrEmpty(update.Text))
    {
        await writer.AppendResponseAsync(update.Text, cancellationToken);
    }
}
 await writer.FinalizeResponseAsync(CancellationToken: cancellationToken);
```

<!-- ai-label -->

Mark the message as system-generated so Teams clearly labels it as AI output.

```csharp
MessageActivityInput reply = new MessageActivityInput().AddAIGenerated();
await writer.FinalizeResponseAsync(msg, cancellationToken);
```

<!-- feedback -->

Enable built-in thumbs up/down controls on the reply and surface a custom feedback form when users respond.

```csharp
MessageActivityInput reply = new MessageActivityInput().AddAIGenerated().AddFeedback(FeedbackTypes.Custom);
await writer.FinalizeResponseAsync(msg, cancellationToken);
```

<!-- clarification-cards -->

```csharp
    private async Task RespondAsync<TActivity>(Context<TActivity> context, string userText, CancellationToken cancellationToken)
        where TActivity : TeamsActivity
    {
        _ = context.Activity.Conversation?.Id
            ?? throw new InvalidOperationException("Missing conversation ID.");

        TeamsStreamingWriter writer = TeamsStreamingWriter.CreateFromContext(context);
        RunResult result = await _agent.RunAsync(context.Activity.Conversation!.Id, userText, writer, cancellationToken);

        MessageActivityInput msg = new MessageActivityInput();

        if (result.PendingCards.Count > 0)
        {
            // Card-only reply (e.g. clarification). No text and no feedback — the card IS the question.
            msg.WithText("")
                .AddAttachment([.. result.PendingCards.Select(c =>
                    TeamsAttachment.CreateBuilder().WithAdaptiveCard(c).Build())])
                    .AddAIGenerated();
        }
        else
        {
            // normal reply: attach follow-ups, citations, feedback (below).
            ...
        }

        await writer.FinalizeResponseAsync(msg, cancellationToken);
    }
```

```csharp
this.OnAdaptiveCardAction(async (context, cancellationToken) =>
{
    if (context.Activity.Value?.Action?.Verb == "clarification")
    {
        string choice = context.Activity.Value.Action.Data?["clarificationChoice"]?.ToString() ?? "";
        await RespondAsync(context, choice, cancellationToken);
    }
    return InvokeResponse.Ok();
});
```

<!-- suggested-prompts -->

```csharp
private const string FollowUpsPrompt = """
    Produce 2 specific prompts the user might want to ask next.

    Output format — read carefully:
    Return ONLY a JSON object INSTANCE, like this:
    {"prompt1": "How do I stream a reply?", "prompt2": "Show me an Adaptive Card example"}

    Each prompt MUST:
    - Be phrased in the first person, as the user would type.
    - Stay under 8 words.

    Pick based on the conversation:
    - If recent turns have substantive content, drill into a concrete topic, API, or
    concept that just came up.
    - Otherwise (e.g. conversation just started, or the last turn is generic),
    suggest prompts that showcase what you can help with based on the MCP tools available.
    """;

private async Task<List<SuggestedAction>> GenerateFollowUpsAsync(
    IReadOnlyList<ChatMessage> history,
    CancellationToken cancellationToken)
{
    List<ChatMessage> messages =
    [
        .. history,
        new ChatMessage(ChatRole.System, FollowUpsPrompt)
    ];

    ChatResponse<FollowUps> response = await _chatClient.GetResponseAsync<FollowUps>(
        messages,
        cancellationToken: cancellationToken);

    if (!response.TryGetResult(out FollowUps? followUps) || followUps is null)
    {
        _logger.LogWarning("Follow-up generation did not return parseable JSON. Raw response: {Text}", response.Text);
        return [];
    }

    return [
        new SuggestedAction(ActionTypes.IMBack, followUps.Prompt1),
        new SuggestedAction(ActionTypes.IMBack, followUps.Prompt2)
    ];
}
```

<!-- citations -->

```csharp
result.Citations.AttachCitations(reply, result.FullText);

public void AttachCitations(MessageActivityInput reply, string fullText)
{
    HashSet<int> used = [];
    foreach (Match match in Regex.Matches(fullText, @"\[(\d+)\]"))
    {
        if (int.TryParse(match.Groups[1].Value, out int position))
            used.Add(position);
    }

    foreach (CitationEntry citation in _citations.Values.Where(e => used.Contains(e.Position)))
    {
        reply.AddCitation(
            citation.Position,
            new CitationAppearance
            {
                Name = string.IsNullOrEmpty(citation.Title)
                    ? $"Source {citation.Position}"
                    : citation.Title[..Math.Min(80, citation.Title.Length)],
                Abstract = string.IsNullOrEmpty(citation.Snippet)
                    ? "No description available."
                    : citation.Snippet,
                Url = Uri.TryCreate(citation.Url, UriKind.Absolute, out Uri? uri) ? uri : null
            });
    }
}
```
