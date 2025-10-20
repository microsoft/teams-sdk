---
sidebar_position: 1
summary: Learn to create Adaptive Cards in Python using builder helpers, enabling type-safe, maintainable UI development with IntelliSense support, visual designer integration, and end-to-end examples for interactive forms.
---

# Building Adaptive Cards

Adaptive Cards are JSON payloads that describe rich, interactive UI fragments.
With `microsoft-teams-cards` you can build these cards entirely in Python while enjoying full IntelliSense and compiler safety.

---

## The Builder Pattern

`microsoft-teams-cards` exposes small **builder helpers** (`Card`, `TextBlock`, `ToggleInput`, `ExecuteAction`, _etc._).
Each helper wraps raw JSON and provides fluent, chainable methods that keep your code concise and readable.

```python
from microsoft.teams.cards import AdaptiveCard, TextBlock, ToggleInput, ActionSet, ExecuteAction

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

Benefits:

| Benefit     | Description                                                                   |
| ----------- | ----------------------------------------------------------------------------- |
| Readability | No deep JSON trees—just chain simple methods.                                 |
| Re‑use      | Extract snippets to functions or classes and share across cards.              |
| Safety      | Builders validate every property against the Adaptive Card schema (see next). |

> Source code lives in `teams.py/packages/cards`. Feel free to inspect or extend the helpers for your own needs.

---

## Type‑safe Authoring & IntelliSense

The package bundles the **Adaptive Card v1.5 schema** as strict Python types.
While coding you get:

- **Autocomplete** for every element and attribute.
- **In‑editor validation**—invalid enum values or missing required properties produce build errors.
- Automatic upgrades when the schema evolves; simply update the package.

```python
# "huge" is not a valid size for TextBlock
text_block = TextBlock(text="Test", wrap=True, weight="Bolder", size="huge"),
```

## The Visual Designer

Prefer a drag‑and‑drop approach? Use [Microsoft's Adaptive Card Designer](https://adaptivecards.microsoft.com/designer.html):

1. Add elements visually until the card looks right.
2. Copy the JSON payload from the editor pane.
3. Paste the JSON into your project **or** convert it to builder calls:

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

This method leverages the full Adaptive Card schema and ensures that the payload adheres strictly to `AdaptiveCard`.

:::tip
You can use a combination of raw JSON and builder helpers depending on whatever you find easier.
:::

---

## End‑to‑end Example – Task Form Card

Below is a complete example showing a task management form. Notice how the builder pattern keeps the file readable and maintainable:

```python
from datetime import datetime
from microsoft.teams.api import MessageActivity, TypingActivityInput
from microsoft.teams.apps import ActivityContext
from microsoft.teams.cards import AdaptiveCard, TextBlock, ActionSet, ExecuteAction, Choice, ChoiceSetInput, DateInput, TextInput
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


## Additional Resources

- [**Official Adaptive Card Documentation**](https://adaptivecards.microsoft.com/)
- [**Adaptive Cards Designer**](https://adaptivecards.microsoft.com/designer.html)

---

### Summary

- Use **builder helpers** for readable, maintainable card code.
- Enjoy **full type safety** and IDE assistance.
- Prototype quickly in the **visual designer** and refine with builders.

Happy card building! 🎉
