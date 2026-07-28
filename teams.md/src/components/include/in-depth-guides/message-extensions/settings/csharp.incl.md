<!-- html-code -->

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Message Extension Settings</title>
    <link
      rel="stylesheet"
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css"
    />
    <script src="https://statics.teams.cdn.office.net/sdk/v1.11.0/js/MicrosoftTeams.min.js"></script>
    <style>
      body {
        margin: 0;
        padding: 10px;
      }
      .form-group {
        margin-bottom: 10px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h3>Message Extension Settings</h3>
      <form id="settingsForm">
        <div class="form-group">
          <label>Selected Option:</label>
          <select class="form-control" id="selectedOption" name="selectedOption">
            <option value="">Please select an option</option>
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
            <option value="option3">Option 3</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary">Save Settings</button>
      </form>
    </div>

    <script>
      microsoftTeams.initialize();

      // Get the selectedOption from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const selectedOption = urlParams.get('selectedOption');
      if (selectedOption) {
        document.getElementById('selectedOption').value = selectedOption;
      }

      document.getElementById('settingsForm').addEventListener('submit', function (event) {
        event.preventDefault();
        let selectedValue = document.getElementById('selectedOption').value;
        microsoftTeams.tasks.submitTask(selectedValue);
      });
    </script>
  </body>
</html>
```

<!-- serve-code -->

```csharp
// In your startup configuration (Program.cs or Startup.cs)
app.UseStaticFiles();
app.MapGet("/tabs/settings", async context =>
{
    var html = await File.ReadAllTextAsync("wwwroot/settings.html");
    context.Response.ContentType = "text/html";
    await context.Response.WriteAsync(html);
});
```

<!-- tabs-note -->

:::note
This will serve the HTML page to the `${BOT_ENDPOINT}/tabs/settings` endpoint as a tab. See [Tabs Guide](../tabs) to learn more.
:::

<!-- query-settings-code -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
using Microsoft.Teams.Api.Cards;
using Microsoft.Teams.Cards;

[MessageExtension.QuerySettingsUrl]
public Microsoft.Teams.Api.MessageExtensions.Response OnMessageExtensionQuerySettingsUrl(
    [Context] Microsoft.Teams.Api.Activities.Invokes.MessageExtensions.QuerySettingsUrlActivity activity,
    [Context] IContext.Client client,
    [Context] Microsoft.Teams.Common.Logging.ILogger log)
{
    log.Info("[MESSAGE_EXT_QUERY_SETTINGS_URL] Settings URL query received");

    // Get user settings (this could come from a database or user store)
    var selectedOption = ""; // Default or retrieve from user preferences

    var botEndpoint = Environment.GetEnvironmentVariable("BOT_ENDPOINT") ?? "https://your-bot-endpoint.com";
    var settingsUrl = $"{botEndpoint}/tabs/settings?selectedOption={Uri.EscapeDataString(selectedOption)}";

    var settingsAction = new CardAction
    {
        Type = CardActionType.OpenUrl,
        Title = "Settings",
        Value = settingsUrl
    };

    var suggestedActions = new Microsoft.Teams.Api.MessageExtensions.SuggestedActions
    {
        Actions = new List<CardAction> { settingsAction }
    };

    var result = new Microsoft.Teams.Api.MessageExtensions.Result
    {
        Type = Microsoft.Teams.Api.MessageExtensions.ResultType.Config,
        SuggestedActions = suggestedActions
    };

    return new Microsoft.Teams.Api.MessageExtensions.Response
    {
        ComposeExtension = result
    };
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

```csharp
using Microsoft.Teams.Apps.MessageExtensions;
using Microsoft.Teams.Apps.Schema;

//...

bot.OnQuerySettingUrl(async (context, cancellationToken) =>
{
    // Get user settings (this could come from a database or user store)
    var selectedOption = ""; // Default or retrieve from user preferences

    var botEndpoint = Environment.GetEnvironmentVariable("BOT_ENDPOINT") ?? "https://your-bot-endpoint.com";
    var settingsUrl = $"{botEndpoint}/tabs/settings?selectedOption={Uri.EscapeDataString(selectedOption)}";

    return MessageExtensionResponse.CreateBuilder()
        .WithType(MessageExtensionResponseTypes.Config)
        .WithSuggestedActions(new SuggestedAction(ActionTypes.OpenUrl, "Settings", settingsUrl))
        .Build();
});
```

</TabItem>
</Tabs>

<!-- handle-submission-code -->

<Tabs groupId="csharp-sdk-version" defaultValue="core">
<TabItem value="legacy" label="SDK 2.0 (Legacy)">

```csharp
[MessageExtension.Setting]
public Microsoft.Teams.Api.MessageExtensions.Response OnMessageExtensionSetting(
    [Context] Microsoft.Teams.Api.Activities.Invokes.MessageExtensions.SettingActivity activity,
    [Context] IContext.Client client,
    [Context] Microsoft.Teams.Common.Logging.ILogger log)
{
    log.Info("[MESSAGE_EXT_SETTING] Settings submission received");

    var state = activity.Value?.State;
    log.Info($"[MESSAGE_EXT_SETTING] State: {state}");

    if (state == "CancelledByUser")
    {
        log.Info("[MESSAGE_EXT_SETTING] User cancelled settings");
        return CreateEmptyResult();
    }

    var selectedOption = state;
    log.Info($"[MESSAGE_EXT_SETTING] Selected option: {selectedOption}");

    // Here you would typically save the user's settings to a database or user store
    // SaveUserSettings(activity.From.Id, selectedOption);

    // Return empty result to close the settings dialog
    return CreateEmptyResult();
}

// Helper method to create empty result
private static Microsoft.Teams.Api.MessageExtensions.Response CreateEmptyResult()
{
    return new Microsoft.Teams.Api.MessageExtensions.Response
    {
        ComposeExtension = new Microsoft.Teams.Api.MessageExtensions.Result
        {
            Type = Microsoft.Teams.Api.MessageExtensions.ResultType.Result,
            AttachmentLayout = Microsoft.Teams.Api.Attachment.Layout.List,
            Attachments = new List<Microsoft.Teams.Api.MessageExtensions.Attachment>()
        }
    };
}
```

</TabItem>
<TabItem value="core" label="SDK 2.1 (Preview)">

SDK 2.1 does not have a dedicated settings-submission handler. Inside your existing `OnInvoke` handler, check for `composeExtension/setting`:

```csharp
bot.OnQuerySetting(async (context, cancellationToken) =>
{
    string? value = context.Activity.Value?.State;

    if (state != "CancelledByUser")
    {
        // Save the user's settings here
        // SaveUserSettings(context.Activity.From.Id, state);
    }

    return new InvokeResponse(200);
}
```

</TabItem>
</Tabs>
