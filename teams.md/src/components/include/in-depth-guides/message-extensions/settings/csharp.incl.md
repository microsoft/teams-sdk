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

<!-- handle-submission-code -->

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
