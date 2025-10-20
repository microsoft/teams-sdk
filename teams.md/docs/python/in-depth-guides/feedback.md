---
sidebar_position: 7
summary: Guide to implementing user feedback functionality in Teams applications, covering feedback UI components, event handling, and storage mechanisms for gathering and managing user responses to improve application performance.
---

# Feedback

User feedback is essential for the improvement of any application. Teams provides specialized UI components to help facilitate the gathering of feedback from users.

![Animated image showing user selecting the thumbs-up button on an agent response and a dialog opening asking 'What did you like?'. The user types 'Nice' and hits Submit.](/screenshots/feedback.gif)

## Storage

Once you receive a feedback event, you can choose to store it in some persistent storage. You'll need to implement storage for tracking:
- Like/dislike counts per message
- Text feedback comments
- Message ID associations

For production applications, consider using databases, file systems, or cloud storage. The examples below use in-memory storage for simplicity.

## Including Feedback Buttons

When sending a message that you want feedback in, simply `add_feedback()` to the message you are sending.
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

## Handling the feedback

Once the user decides to like/dislike the message, you can handle the feedback in a received event. Once received, you can choose to include it in your persistent store.
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

