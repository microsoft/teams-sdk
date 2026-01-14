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

```python
app.page("settings", str(Path(__file__).parent), "/tabs/settings")
```

<!-- query-settings-code -->

```python
@app.on_message_ext_query_settings_url
async def handle_message_ext_query_settings_url(ctx: ActivityContext[MessageExtensionQuerySettingUrlInvokeActivity]):
    user_settings = {"selectedOption": ""}
    escaped_selected_option = user_settings["selectedOption"]

    bot_endpoint = os.environ.get("BOT_ENDPOINT", "")

    settings_action = CardAction(
        type=CardActionType.OPEN_URL,
        title="Settings",
        value=f"{bot_endpoint}/tabs/settings?selectedOption={escaped_selected_option}",
    )

    suggested_actions = MessagingExtensionSuggestedAction(actions=[settings_action])

    result = MessagingExtensionResult(type=MessagingExtensionResultType.CONFIG, suggested_actions=suggested_actions)

    return MessagingExtensionInvokeResponse(compose_extension=result)
```

<!-- handle-submission-code -->

```python
@app.on_message_ext_setting
async def handle_message_ext_setting(ctx: ActivityContext[MessageExtensionSettingInvokeActivity]):
    state = getattr(ctx.activity.value, "state", None)

    if state == "CancelledByUser":
        result = MessagingExtensionResult(
            type=MessagingExtensionResultType.RESULT, attachment_layout=AttachmentLayout.LIST, attachments=[]
        )
        return MessagingExtensionInvokeResponse(compose_extension=result)

    selected_option = state
    await ctx.send(f"Selected option: {selected_option}")

    result = MessagingExtensionResult(
        type=MessagingExtensionResultType.RESULT, attachment_layout=AttachmentLayout.LIST, attachments=[]
    )

    return MessagingExtensionInvokeResponse(compose_extension=result)
```

<!-- tabs-note -->

:::note
This will serve the HTML page to the `${BOT_ENDPOINT}/tabs/settings` endpoint as a tab. See [Tabs Guide](../tabs) to learn more.
:::
