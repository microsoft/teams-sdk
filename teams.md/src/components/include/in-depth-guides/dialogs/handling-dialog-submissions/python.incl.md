<!-- event-intro -->

Dialogs have a specific `dialog_submit` event to handle submissions. When a user submits a form inside a dialog, the app is notified via this event, which is then handled to process the submission values, and can either send a response or proceed to more steps in the dialogs (see [Multi-step Dialogs](./handling-multi-step-forms)).

<!-- adaptive-card-example -->

```python
from typing import Optional, Any
from microsoft_teams.api import TaskSubmitInvokeActivity, TaskModuleResponse, TaskModuleMessageResponse
from microsoft_teams.apps import ActivityContext
# ...

@app.on_dialog_submit
async def handle_dialog_submit(ctx: ActivityContext[TaskSubmitInvokeActivity]):
    """Handle dialog submit events for all dialog types."""
    data: Optional[Any] = ctx.activity.value.data
    dialog_type = data.get("submissiondialogtype") if data else None

    if dialog_type == "simple_form":
        name = data.get("name") if data else None
        await ctx.send(f"Hi {name}, thanks for submitting the form!")
        return TaskModuleResponse(task=TaskModuleMessageResponse(value="Form was submitted"))
```

<!-- webpage-example -->

```python
from typing import Optional, Any
from microsoft_teams.api import TaskSubmitInvokeActivity, InvokeResponse, TaskModuleResponse, TaskModuleMessageResponse
from microsoft_teams.apps import ActivityContext
# ...

@app.on_dialog_submit
async def handle_dialog_submit(ctx: ActivityContext[TaskSubmitInvokeActivity]):
    """Handle dialog submit events for all dialog types."""
    data: Optional[Any] = ctx.activity.value.data
    dialog_type = data.get("submissiondialogtype") if data else None

    if dialog_type == "webpage_dialog":
        name = data.get("name") if data else None
        email = data.get("email") if data else None
        await ctx.send(f"Hi {name}, thanks for submitting the form! We got that your email is {email}")
        return InvokeResponse(
            body=TaskModuleResponse(task=TaskModuleMessageResponse(value="Form submitted successfully"))
        )
```

<!-- complete-example -->

N/A
