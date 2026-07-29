<!-- event-intro -->

Dialogs have a specific `TaskSubmit` event to handle submissions. When a user submits a form inside a dialog, the app is notified via this event, which is then handled to process the submission values, and can either send a response or proceed to more steps in the dialogs (see [Multi-step Dialogs](./handling-multi-step-forms)).

:::warning Return Type Requirement
Methods decorated with `[TaskSubmit]` **must** return `Task<Microsoft.Teams.Api.TaskModules.Response>`. Every code path must return a Response object containing either a `MessageTask` (to show a message and close the dialog) or a `ContinueTask` (to show another dialog). Using just `Task` or `void` will compile but fail at runtime when the Teams client expects a Response object.
:::

## Basic Example

<!-- adaptive-card-example -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using System.Text.Json;
using Microsoft.Teams.Api.TaskModules;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities.Invokes;
using Microsoft.Teams.Apps.Annotations;
using Microsoft.Teams.Common.Logging;

//...

[TaskSubmit]
public async Task<Microsoft.Teams.Api.TaskModules.Response> OnTaskSubmit([Context] Tasks.SubmitActivity activity, [Context] IContext.Client client, [Context] ILogger log)
{
    var data = activity.Value?.Data as JsonElement?;
    if (data == null)
    {
        log.Info("[TASK_SUBMIT] No data found in the activity value");
        return new Microsoft.Teams.Api.TaskModules.Response(
            new Microsoft.Teams.Api.TaskModules.MessageTask("No data found in the activity value"));
    }

    var submissionType = data.Value.TryGetProperty("submissiondialogtype", out var submissionTypeObj) && submissionTypeObj.ValueKind == JsonValueKind.String
        ? submissionTypeObj.ToString()
        : null;


    string? GetFormValue(string key)
    {
        if (data.Value.TryGetProperty(key, out var val))
        {
            if (val is JsonElement element)
                return element.GetString();
            return val.ToString();
        }
        return null;
    }

    switch (submissionType)
    {
        case "simple_form":
            var name = GetFormValue("name") ?? "Unknown";
            await client.Send($"Hi {name}, thanks for submitting the form!");
            return new Microsoft.Teams.Api.TaskModules.Response(
                new Microsoft.Teams.Api.TaskModules.MessageTask("Form was submitted"));
        // More examples below
        default:
            return new Microsoft.Teams.Api.TaskModules.Response(
                new Microsoft.Teams.Api.TaskModules.MessageTask("Unknown submission type"));
    }
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps.TaskModules;

//...

teams.OnTaskSubmit(async (context, cancellationToken) =>
{
    var data = context.Activity.Value?.Data as JsonElement?;
    if (data == null)
    {
        return TaskModuleResponse.CreateBuilder()
            .WithType(TaskModuleResponseTypes.Message)
            .WithMessage("No data found in the activity value")
            .Build();
    }

    var submissionType = data.Value.TryGetProperty("submissiondialogtype", out var submissionTypeObj) && submissionTypeObj.ValueKind == JsonValueKind.String
        ? submissionTypeObj.ToString()
        : null;

    string? GetFormValue(string key)
    {
        if (data.Value.TryGetProperty(key, out var val))
        {
            if (val is JsonElement element)
                return element.GetString();
            return val.ToString();
        }
        return null;
    }

    switch (submissionType)
    {
        case "simple_form":
            var name = GetFormValue("name") ?? "Unknown";
            await context.SendAsync($"Hi {name}, thanks for submitting the form!", cancellationToken);
            return TaskModuleResponse.CreateBuilder()
                .WithType(TaskModuleResponseTypes.Message)
                .WithMessage("Form was submitted")
                .Build();
        // More examples below
        default:
            return TaskModuleResponse.CreateBuilder()
                .WithType(TaskModuleResponseTypes.Message)
                .WithMessage("Unknown submission type")
                .Build();
    }
});
```

</TabItem>
</Tabs>

<!-- webpage-example -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
// Add this case to the switch statement in OnTaskSubmit method
case "webpage_dialog":
    var webName = GetFormValue("name") ?? "Unknown";
    var email = GetFormValue("email") ?? "No email";
    await client.Send($"Hi {webName}, thanks for submitting the form! We got that your email is {email}");
    return new Microsoft.Teams.Api.TaskModules.Response(
        new Microsoft.Teams.Api.TaskModules.MessageTask("Form submitted successfully"));
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
// Add this case to the switch statement in the OnTaskSubmit handler
case "webpage_dialog":
    var webName = GetFormValue("name") ?? "Unknown";
    var email = GetFormValue("email") ?? "No email";
    await context.SendAsync($"Hi {webName}, thanks for submitting the form! We got that your email is {email}", cancellationToken);
    return TaskModuleResponse.CreateBuilder()
        .WithType(TaskModuleResponseTypes.Message)
        .WithMessage("Form submitted successfully")
        .Build();
```

</TabItem>
</Tabs>

<!-- complete-example -->

### Complete TaskSubmit Handler Example

Here's the complete example showing how to handle multiple submission types:

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using System.Text.Json;
using Microsoft.Teams.Api.TaskModules;
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Activities.Invokes;
using Microsoft.Teams.Apps.Annotations;
using Microsoft.Teams.Common.Logging;

//...

[TaskSubmit]
public async Task<Microsoft.Teams.Api.TaskModules.Response> OnTaskSubmit([Context] Tasks.SubmitActivity activity, [Context] IContext.Client client, [Context] ILogger log)
{
    var data = activity.Value?.Data as JsonElement?;
    if (data == null)
    {
        log.Info("[TASK_SUBMIT] No data found in the activity value");
        return new Microsoft.Teams.Api.TaskModules.Response(
            new Microsoft.Teams.Api.TaskModules.MessageTask("No data found in the activity value"));
    }

    var submissionType = data.Value.TryGetProperty("submissiondialogtype", out var submissionTypeObj) && submissionTypeObj.ValueKind == JsonValueKind.String
        ? submissionTypeObj.ToString()
        : null;

    string? GetFormValue(string key)
    {
        if (data.Value.TryGetProperty(key, out var val))
        {
            if (val is JsonElement element)
                return element.GetString();
            return val.ToString();
        }
        return null;
    }

    switch (submissionType)
    {
        case "simple_form":
            var name = GetFormValue("name") ?? "Unknown";
            await client.Send($"Hi {name}, thanks for submitting the form!");
            return new Microsoft.Teams.Api.TaskModules.Response(
                new Microsoft.Teams.Api.TaskModules.MessageTask("Form was submitted"));

        case "webpage_dialog":
            var webName = GetFormValue("name") ?? "Unknown";
            var email = GetFormValue("email") ?? "No email";
            await client.Send($"Hi {webName}, thanks for submitting the form! We got that your email is {email}");
            return new Microsoft.Teams.Api.TaskModules.Response(
                new Microsoft.Teams.Api.TaskModules.MessageTask("Form submitted successfully"));

        default:
            return new Microsoft.Teams.Api.TaskModules.Response(
                new Microsoft.Teams.Api.TaskModules.MessageTask("Unknown submission type"));
    }
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (current)" default>

```csharp
using System.Text.Json;
using Microsoft.Teams.Apps.TaskModules;

//...

teams.OnTaskSubmit(async (context, cancellationToken) =>
{
    var data = context.Activity.Value?.Data as JsonElement?;
    if (data == null)
    {
        return TaskModuleResponse.CreateBuilder()
            .WithType(TaskModuleResponseTypes.Message)
            .WithMessage("No data found in the activity value")
            .Build();
    }

    var submissionType = data.Value.TryGetProperty("submissiondialogtype", out var submissionTypeObj) && submissionTypeObj.ValueKind == JsonValueKind.String
        ? submissionTypeObj.ToString()
        : null;

    string? GetFormValue(string key)
    {
        if (data.Value.TryGetProperty(key, out var val))
        {
            if (val is JsonElement element)
                return element.GetString();
            return val.ToString();
        }
        return null;
    }

    switch (submissionType)
    {
        case "simple_form":
            var name = GetFormValue("name") ?? "Unknown";
            await context.SendAsync($"Hi {name}, thanks for submitting the form!", cancellationToken);
            return TaskModuleResponse.CreateBuilder()
                .WithType(TaskModuleResponseTypes.Message)
                .WithMessage("Form was submitted")
                .Build();

        case "webpage_dialog":
            var webName = GetFormValue("name") ?? "Unknown";
            var email = GetFormValue("email") ?? "No email";
            await context.SendAsync($"Hi {webName}, thanks for submitting the form! We got that your email is {email}", cancellationToken);
            return TaskModuleResponse.CreateBuilder()
                .WithType(TaskModuleResponseTypes.Message)
                .WithMessage("Form submitted successfully")
                .Build();

        default:
            return TaskModuleResponse.CreateBuilder()
                .WithType(TaskModuleResponseTypes.Message)
                .WithMessage("Unknown submission type")
                .Build();
    }
});
```

</TabItem>
</Tabs>
