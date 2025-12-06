<!-- ai-generated-method -->

This can be done by adding a `addAiGenerated` property to outgoing message.

<!-- ai-generated-code -->

```python
message_to_be_sent = MessageActivityInput(text="Hello!").add_ai_generated()
```

<!-- citations-method -->

This is easy to do by simply using the `addCitations` method on the message. This will add a citation to the message, and the LLM will be able to use it to generate a citation for the user.

<!-- citations-code -->

```python
from microsoft_teams.api import MessageActivityInput, CitationAppearance

message_activity = MessageActivityInput(text=result.content).add_ai_generated()
for i, doc in enumerate(cited_docs):
    message_activity.text += f"[{i + 1}]"
    message_activity.add_citation(i + 1, CitationAppearance(name=doc["title"], abstract=doc["content"]))
```

<!-- suggested-actions-method -->

You can do that by using the `with_suggested_actions` method on the message.

<!-- suggested-actions-code -->

```python
from microsoft_teams.api import CardAction, CardActionType, MessageActivityInput, SuggestedActions

suggested_actions = SuggestedActions(
    to=[activity.from_.id],
    actions=[CardAction(type=CardActionType.IM_BACK, title="Thanks!", value="Thank you so much!")],
)
message = (
    MessageActivityInput(text=chat_result.response.content)
    .add_ai_generated()
    .with_suggested_actions(suggested_actions)
)
await ctx.send(message)
```
