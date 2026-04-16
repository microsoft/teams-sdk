# TypeScript Teams Bot with Tab

This is a Microsoft Teams bot template that includes a personal tab built with Vite.

## Structure

- `src/index.ts`: Main bot application code.
- `src/Tab/`: React app for the personal tab, bundled by Vite.

## Static Tab

This template serves a personal tab at `/tabs/test`. After creating your app, add a static tab entry to the manifest:

```bash
teams app manifest download <appId> manifest.json
```

Add the following to the `staticTabs` array in `manifest.json`:

```json
{
  "entityId": "test",
  "name": "Test",
  "contentUrl": "https://<BOT_DOMAIN>/tabs/test",
  "websiteUrl": "https://<BOT_DOMAIN>/tabs/test",
  "scopes": ["personal", "team"]
}
```

Then upload the updated manifest:

```bash
teams app manifest upload manifest.json <appId>
```

## Getting Started

1. Install dependencies: `npm install`
2. Run the app: `npm start`
