<!-- streaming -->

`ExtAIBot` streams incremental model text with `TeamsStreamingWriter`:

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
```

<!-- ai-label -->

The sample marks generated content via Teams entities (`AIGeneratedContent`) when finalizing:

```csharp
return claims.Count == 0
    ? [new OMessageEntity { AdditionalType = ["AIGeneratedContent"] }]
    : [new CitationEntity { AdditionalType = ["AIGeneratedContent"], Citation = claims }];
```

<!-- feedback -->

Enable custom feedback and handle both fetch and submit:

```csharp
this.OnMessageFetchTask((context, cancellationToken) =>
{
    string? reaction = context.Activity.Value?.Data?.ActionValue?.Reaction;
    return Task.FromResult(TaskModuleResponse.CreateBuilder()
        .WithType(TaskModuleResponseTypes.Continue)
        .WithTitle("Feedback")
        .WithHeight(TaskModuleSizes.Small)
        .WithWidth(TaskModuleSizes.Small)
        .WithCard(BuildFeedbackCard(reaction))
        .Build());
});

this.OnMessageSubmitFeedback((context, cancellationToken) =>
{
    MessageSubmitFeedbackValue? feedback = context.Activity.Value;
    _logger.LogInformation("Feedback received — reaction: {Reaction}, feedback: {Feedback}",
        feedback?.Reaction, feedback?.Feedback);
    return Task.FromResult(InvokeResponse.Ok());
});
```

<!-- clarification-cards -->

When clarification is required, emit card-only output for that turn:

```csharp
if (result.PendingCards.Count > 0)
{
    finalBuilder.WithText("")
        .AddAttachment([.. result.PendingCards.Select(c =>
            TeamsAttachment.CreateBuilder().WithAdaptiveCard(c).Build())]);
}
```

The card submit route re-enters the same agent pipeline:

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

The sample generates exactly two follow-ups as structured output and attaches them:

```csharp
List<SuggestedAction> followUpActions = await GenerateFollowUpsAsync(history, cancellationToken);
if (result.FollowUpActions.Count > 0)
    finalBuilder.WithSuggestedActions(new SuggestedActions().AddActions([.. result.FollowUpActions]));
```

<!-- citations -->

Build citation entities from extracted sources and attach to the final response:

```csharp
IList<Entity> entities = result.Citations.BuildEntities(result.FullText);
foreach (Entity entity in entities) finalBuilder.AddEntity(entity);

await writer.FinalizeResponseAsync(finalBuilder, cancellationToken);
```
