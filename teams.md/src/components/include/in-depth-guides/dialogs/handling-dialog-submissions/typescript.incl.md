<!-- event-intro -->

When a user submits a form inside a dialog, your app receives a `dialog.submit` event. Use `dialog.submit.<action>` to handle a specific submission (where `action` matches the value passed via `SubmitData`), or `dialog.submit` for a catch-all. You can either send a response or proceed to more steps in the dialog (see [Multi-step Dialogs](./handling-multi-step-forms)).

<!-- adaptive-card-example -->

```typescript
import { App } from '@microsoft/teams.apps';
// ...

// The "action" field in SubmitData('simple_form') routes here
app.on('dialog.submit.simple_form', async ({ activity, send }) => {
  const name = activity.value.data.name;
  await send(`Hi ${name}, thanks for submitting the form!`);
  return {
    task: {
      type: 'message',
      // This appears as a final message in the dialog
      value: 'Form was submitted',
    },
  };
});
```

<!-- webpage-example -->

```typescript
import { App } from '@microsoft/teams.apps';
// ...

// Webpage submissions route the same way — the webpage must include
// the "action" field in the data passed to microsoftTeams.tasks.submitTask()
app.on('dialog.submit.webpage_dialog', async ({ activity, send }) => {
  const name = activity.value.data.name;
  const email = activity.value.data.email;
  await send(`Hi ${name}, thanks for submitting the form! We got that your email is ${email}`);
  // Return status 200 to close the dialog without showing a message
  return {
    status: 200,
  };
});
```

<!-- complete-example -->

N/A
