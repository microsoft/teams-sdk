<!-- event-intro -->

When a user submits a form inside a dialog, your app receives a `dialog_submit` event. Use `@app.on_dialog_submit("action")` to handle a specific submission (where `action` matches the value passed via `SubmitData`), or `@app.on_dialog_submit()` for a catch-all. You can either send a response or proceed to more steps in the dialog (see [Multi-step Dialogs](./handling-multi-step-forms)).

<!-- adaptive-card-example -->

```python
from microsoft_teams.api import TaskSubmitInvokeActivity, TaskModuleResponse, TaskModuleMessageResponse
from microsoft_teams.apps import ActivityContext
# ...

# The "action" field in SubmitData("simple_form") routes here
@app.on_dialog_submit("simple_form")
async def handle_simple_form_submit(ctx: ActivityContext[TaskSubmitInvokeActivity]):
    data = ctx.activity.value.data
    name = data.get("name")
    await ctx.send(f"Hi {name}, thanks for submitting the form!")
    return TaskModuleResponse(task=TaskModuleMessageResponse(value="Form was submitted"))
```

<!-- webpage-example -->

```python
from microsoft_teams.api import TaskSubmitInvokeActivity, TaskModuleResponse, TaskModuleMessageResponse
from microsoft_teams.apps import ActivityContext
# ...

# Webpage submissions route the same way — the webpage must include
# the "action" field in the data passed to microsoftTeams.dialog.url.submit()
@app.on_dialog_submit("webpage_dialog")
async def handle_webpage_dialog_submit(ctx: ActivityContext[TaskSubmitInvokeActivity]):
    data = ctx.activity.value.data
    name = data.get("name")
    email = data.get("email")
    await ctx.send(f"Hi {name}, thanks for submitting the form! We got that your email is {email}")
    return TaskModuleResponse(task=TaskModuleMessageResponse(value="Form submitted successfully"))
```

<!-- complete-example -->

N/A
