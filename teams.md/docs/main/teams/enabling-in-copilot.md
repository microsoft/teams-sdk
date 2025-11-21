---
sidebar_position: 6
summary: Learn how to enable your Teams app to work in M365 Copilot by updating the app manifest.
---

# Enabling in M365 Copilot

If you've built a Teams app or agent and want to make it available in M365 Copilot, you can easily do so by updating your app manifest. This allows users to interact with your agent through Copilot's interface.

## Prerequisites

Before enabling your app in Copilot, ensure you have:

1. A working Teams app or agent
2. Completed the app registration process (see "Running in Teams" for your language)
3. Your `BOT_ID` from the app registration

## Updating the Manifest

To enable your app in Copilot, add the following configuration to your `manifest.json` file:

```json
"copilotAgents": {
  "customEngineAgents": [
    {
      "type": "bot",
      "id": "${{BOT_ID}}"
    }
  ]
}
```

The `BOT_ID` is assigned to your agent after you have registered your application. If you followed the "Running in Teams" guide for your language, this ID should already be available in your environment configuration.

## Location of the Manifest

The manifest file is typically located in the `appPackage` folder of your project. If you used the Teams CLI to set up your project, this folder was automatically created for you.

### Example Manifest Structure

Here's how the `copilotAgents` section fits into the overall manifest structure:

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.19/MicrosoftTeams.schema.json",
  "manifestVersion": "1.19",
  "version": "1.0.0",
  "id": "${{APP_ID}}",
  "developer": {
    "name": "Your Company",
    "websiteUrl": "https://www.example.com",
    "privacyUrl": "https://www.example.com/privacy",
    "termsOfUseUrl": "https://www.example.com/terms"
  },
  "name": {
    "short": "Your App Name",
    "full": "Your Full App Name"
  },
  "description": {
    "short": "Short description",
    "full": "Full description of your app"
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#FFFFFF",
  "bots": [
    {
      "botId": "${{BOT_ID}}",
      "scopes": [
        "personal",
        "team",
        "groupchat"
      ],
      "supportsFiles": false,
      "isNotificationOnly": false
    }
  ],
  "copilotAgents": {
    "customEngineAgents": [
      {
        "type": "bot",
        "id": "${{BOT_ID}}"
      }
    ]
  }
}
```

## Regenerating the App Package

After updating the manifest, you need to zip the manifest and icon files into an app package:

### Using Microsoft 365 Agents Toolkit

If you're using the Microsoft 365 Agents Toolkit, the app package is automatically regenerated when you build or debug your app. The toolkit will:

1. Read your updated manifest
2. Replace variables like `${{BOT_ID}}` with actual values from your environment
3. Package the manifest and icons into a zip file
4. Deploy the updated package to Teams

### Manual Packaging

If you're manually packaging your app:

1. Ensure the `manifest.json` file is updated with the `copilotAgents` section
2. Create a zip file containing:
   - `manifest.json`
   - `color.png` (192x192 icon)
   - `outline.png` (32x32 icon)
3. Upload the zip file to Teams

## Testing in Copilot

Once you've updated and redeployed your app:

1. Open M365 Copilot in Teams or at [m365.cloud.microsoft](https://m365.cloud.microsoft/)
2. Your app should now be available as an agent option
3. Interact with your agent through the Copilot interface

## Resources

- [Convert Your Declarative Agent for Microsoft 365 Copilot to a Custom Engine Agent](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/convert-declarative-agent)
- [Teams app manifest reference](https://learn.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema)
