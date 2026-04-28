---
sidebar_position: 6
summary: Learn how to enable your Teams app to work in M365 Copilot by updating the app manifest.
---

# Enabling in M365 Copilot

If you've built a Teams app or agent and want to make it available in M365 Copilot, you can do so with a single CLI command that handles the manifest update automatically.

## Using the Teams CLI

```bash
teams app update <appId> --scopes personal,team,copilot
```

This command:
- Adds `copilot` to the bot's scope list (and ensures `personal` is included — required by M365 Copilot)
- Adds the `copilotAgents.customEngineAgents` block to the manifest automatically
- Bumps the app version so Teams recognizes the change

Then reinstall the app. The quickest way is the install link from the original `teams app create` output. If you need to retrieve it again:

```bash
teams app get <appId> --install-link
```

## Testing in Copilot

Once the updated app is installed:

1. Open M365 Copilot in Teams or at [m365.cloud.microsoft](https://m365.cloud.microsoft/)
2. Your app should now be available as an agent option
3. Interact with your agent through the Copilot interface

## Manual Manifest Editing

If you are not using the Teams CLI, you can update the manifest by hand. Add the following to your `manifest.json`:

```json
"bots": [
  {
    "botId": "<your-bot-id>",
    "scopes": ["personal", "team", "groupChat", "copilot"]
  }
],
"copilotAgents": {
  "customEngineAgents": [
    {
      "type": "bot",
      "id": "<your-bot-id>"
    }
  ]
}
```

After editing, re-package and upload the manifest:

```bash
teams app manifest upload <appId> ./manifest.json
```

Or zip the manifest and icons manually (manifest.json + color.png + outline.png) and sideload the zip in Teams.

## Resources

- [Convert Your Declarative Agent for Microsoft 365 Copilot to a Custom Engine Agent](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/convert-declarative-agent)
- [Teams app manifest reference](https://learn.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema)
