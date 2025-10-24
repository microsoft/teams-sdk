<!-- storage -->

Once you receive a feedback event, you can choose to store it in some persistent storage. You'll need to implement storage for tracking:

- Like/dislike counts per message
- Text feedback comments
- Message ID associations

For production applications, consider using databases, file systems, or cloud storage. The examples below use in-memory storage for simplicity.

<!-- including-feedback -->

```python
from microsoft.teams.ai import Agent
from microsoft.teams.api import MessageActivityInput
from microsoft.teams.apps import ActivityContext, MessageActivity

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    """Handle 'feedback demo' command to demonstrate feedback collection"""
    agent = Agent(current_model)
    chat_result = await agent.send(
        input="Tell me a short joke",
        instructions="You are a comedian. Keep responses brief and funny."
    )

    if chat_result.response.content:
        message = MessageActivityInput(text=chat_result.response.content)
                    .add_ai_generated()
                    # Create message with feedback enabled
                    .add_feedback()
        await ctx.send(message)
```

<!-- handling-feedback -->

```python
import json
from typing import Dict, Any
from microsoft.teams.api import MessageSubmitActionInvokeActivity
from microsoft.teams.apps import ActivityContext
# ...

# Handle feedback submission events
@app.on_message_submit_feedback
async def handle_message_feedback(ctx: ActivityContext[MessageSubmitActionInvokeActivity]):
    """Handle feedback submission events"""
    activity = ctx.activity

    # Extract feedback data from activity value
    if not hasattr(activity, "value") or not activity.value:
        logger.warning(f"No value found in activity {activity.id}")
        return

    # Access feedback data directly from invoke value
    invoke_value = activity.value
    assert invoke_value.action_name == "feedback"
    feedback_str = invoke_value.action_value.feedback
    reaction = invoke_value.action_value.reaction
    feedback_json: Dict[str, Any] = json.loads(feedback_str)
    # { 'feedbackText': 'the ai response was great!' }

    if not activity.reply_to_id:
        logger.warning(f"No replyToId found for messageId {activity.id}")
        return

    # Store the feedback (implement your own storage logic)
    upsert_feedback_storage(activity.reply_to_id, reaction, feedback_json.get('feedbackText', ''))

    # Optionally Send confirmation response
    feedback_text: str = feedback_json.get("feedbackText", "")
    reaction_text: str = f" and {reaction}" if reaction else ""
    text_part: str = f" with comment: '{feedback_text}'" if feedback_text else ""

    await ctx.reply(f"✅ Thank you for your feedback{reaction_text}{text_part}!")
```
