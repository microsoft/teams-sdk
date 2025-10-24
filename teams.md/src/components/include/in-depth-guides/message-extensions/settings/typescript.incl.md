<!-- html-code -->

```html
<html>
  <body>
    <form>
      <fieldset>
        <legend>What programming language do you prefer?</legend>
        <input type="radio" name="selectedOption" value="typescript" />Typescript<br />
        <input type="radio" name="selectedOption" value="csharp" />C#<br />
      </fieldset>

      <br />
      <input type="button" onclick="onSubmit()" value="Save" /> <br />
    </form>

    <script
      src="https://res.cdn.office.net/teams-js/2.34.0/js/MicrosoftTeams.min.js"
      integrity="sha384-brW9AazbKR2dYw2DucGgWCCcmrm2oBFV4HQidyuyZRI/TnAkmOOnTARSTdps3Hwt"
      crossorigin="anonymous"
    ></script>

    <script type="text/javascript">
      document.addEventListener('DOMContentLoaded', function () {
        // Get the selected option from the URL
        var urlParams = new URLSearchParams(window.location.search);
        var selectedOption = urlParams.get('selectedOption');
        if (selectedOption) {
          var checkboxes = document.getElementsByName('selectedOption');
          for (var i = 0; i < checkboxes.length; i++) {
            var thisCheckbox = checkboxes[i];
            if (selectedOption.includes(thisCheckbox.value)) {
              checkboxes[i].checked = true;
            }
          }
        }
      });
    </script>

    <script type="text/javascript">
      // initialize the Teams JS SDK
      microsoftTeams.app.initialize();

      // Run when the user clicks the submit button
      function onSubmit() {
        var newSettings = '';

        var checkboxes = document.getElementsByName('selectedOption');

        for (var i = 0; i < checkboxes.length; i++) {
          if (checkboxes[i].checked) {
            newSettings = checkboxes[i].value;
          }
        }

        // Closes the settings page and returns the selected option to the bot
        microsoftTeams.authentication.notifySuccess(newSettings);
      }
    </script>
  </body>
</html>
```

<!-- serve-code -->

```typescript
import path from 'path';
import { App } from '@microsoft/teams.apps';
// ...

app.tab('settings', path.resolve(__dirname));
```

<!-- query-settings-code -->

```typescript
import { App } from '@microsoft/teams.apps';
// ...

app.on('message.ext.query-settings-url', async ({ activity }) => {
  // Get user settings from storage if available
  const userSettings = (await app.storage.get(activity.from.id)) || { selectedOption: '' };
  const escapedSelectedOption = encodeURIComponent(userSettings.selectedOption);

  return {
    composeExtension: {
      type: 'config',
      suggestedActions: {
        actions: [
          {
            type: 'openUrl',
            title: 'Settings',
            // ensure the bot endpoint is set in the environment variables
            // process.env.BOT_ENDPOINT is not populated by default in the Teams Toolkit setup.
            value: `${process.env.BOT_ENDPOINT}/tabs/settings?selectedOption=${escapedSelectedOption}`,
          },
        ],
      },
    },
  };
});
```

<!-- handle-submission-code -->

```typescript
import { App } from '@microsoft/teams.apps';
// ...

app.on('message.ext.setting', async ({ activity, send }) => {
  const { state } = activity.value;
  if (state == 'CancelledByUser') {
    return {
      status: 400,
    };
  }
  const selectedOption = state;

  // Save the selected option to storage
  await app.storage.set(activity.from.id, { selectedOption });

  await send(`Selected option: ${selectedOption}`);

  return {
    status: 200,
  };
});
```

<!-- tabs-note -->

:::note
This will serve the HTML page to the `${BOT_ENDPOINT}/tabs/settings` endpoint as a tab. See [Tabs Guide](../tabs/README) to learn more.
:::
