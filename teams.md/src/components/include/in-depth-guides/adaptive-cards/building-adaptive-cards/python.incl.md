<!-- package-name -->

`microsoft-teams-cards`

<!-- intro-description -->

With `microsoft-teams-cards` you can build these cards entirely in Python while enjoying full IntelliSense and compiler safety.

<!-- builder-description -->

`microsoft-teams-cards` exposes small **builder helpers** including `Card`, `TextBlock`, `ToggleInput`, `ExecuteAction`, _etc._

<!-- language-name -->

Python

<!-- builder-example -->

```python
from microsoft_teams.cards import AdaptiveCard, TextBlock, ToggleInput, ActionSet, ExecuteAction

card = AdaptiveCard(
        schema="http://adaptivecards.io/schemas/adaptive-card.json",
        body=[
            TextBlock(text="Hello world", wrap=True, weight="Bolder"),
            ToggleInput(label="Notify me").with_id("notify"),
            ActionSet(
                actions=[
                    ExecuteAction(title="Submit")
                    .with_data({"action": "submit_basic"})
                    .with_associated_inputs("auto")
                ]
            ),
        ],
    )
```

<!-- source-code-note -->

:::info
The builder helpers use typed dictionaries and type hints. Use your IDE's IntelliSense features to explore available properties. Source code lives in the `teams.cards` module.
:::

<!-- type-safety-example -->

```python
# "huge" is not a valid size for TextBlock
text_block = TextBlock(text="Test", wrap=True, weight="Bolder", size="huge"),
```

<!-- additional-type-info -->

<!-- designer-example -->

```python

card = AdaptiveCard.model_validate(
    {
        "type": "AdaptiveCard",
        "body": [
            {
                "type": "ColumnSet",
                "columns": [
                    {
                        "type": "Column",
                        "verticalContentAlignment": "center",
                        "items": [
                            {
                                "type": "Image",
                                "style": "Person",
                                "url": "https://aka.ms/AAp9xo4",
                                "size": "Small",
                                "altText": "Portrait of David Claux",
                            }
                        ],
                        "width": "auto",
                    },
                    {
                        "type": "Column",
                        "spacing": "medium",
                        "verticalContentAlignment": "center",
                        "items": [{"type": "TextBlock", "weight": "Bolder", "text": "David Claux", "wrap": True}],
                        "width": "auto",
                    },
                    {
                        "type": "Column",
                        "spacing": "medium",
                        "verticalContentAlignment": "center",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": "Principal Platform Architect at Microsoft",
                                "isSubtle": True,
                                "wrap": True,
                            }
                        ],
                        "width": "stretch",
                    },
                ],
            }
        ],
        "version": "1.5",
    }
)
# Send the card as an attachment
message = MessageActivityInput(text="Hello text!").add_card(card)
```

<!-- card-interface -->

`AdaptiveCard`

<!-- example-intro -->

Notice how the builder pattern keeps the file readable and maintainable:

<!-- task-form-example -->

```python
from datetime import datetime
from microsoft_teams.api import MessageActivity, TypingActivityInput
from microsoft_teams.apps import ActivityContext
from microsoft_teams.cards import AdaptiveCard, TextBlock, ActionSet, ExecuteAction, Choice, ChoiceSetInput, DateInput, TextInput
# ...

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    await ctx.reply(TypingActivityInput())

    card = AdaptiveCard(
        schema="http://adaptivecards.io/schemas/adaptive-card.json",
        body=[
            TextBlock(text="Create New Task", weight="Bolder", size="Large"),
            TextInput(id="title").with_label("Task Title").with_placeholder("Enter task title"),
            TextInput(id="description").with_label("Description").with_placeholder("Enter task details").with_is_multiline(True),
            ChoiceSetInput(choices=[
                Choice(title="High", value="high"),
                Choice(title="Medium", value="medium"),
                Choice(title="Low", value="low"),
            ]).with_id("priority").with_label("Priority").with_value("medium"),
            DateInput(id="due_date").with_label("Due Date").with_value(datetime.now().strftime("%Y-%m-%d")),
            ActionSet(
                actions=[
                    ExecuteAction(title="Create Task")
                    .with_data({"action": "create_task"})
                    .with_associated_inputs("auto")
                    .with_style("positive")
                ]
            ),
        ],
    )

    await ctx.send(card)
```
