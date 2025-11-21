---
sidebar_position: 2
summary: Inspect all incoming and outgoing activities with your agent using DevTools Activities page for debugging.
llms: ignore
---

# 🔍 Inspect activities

Inspect incoming and outgoing activities on DevTools' Activities page. All interactions with your agent are logged here, including messages, reactions, and more.
![Inspect Activities view](https://github.com/microsoft/teams.ts/blob/main/assets/screenshots/inspect_activity.png?raw=true)

## View all activity

The Activities page displays all activities sent to and from your agent in a grid, showing:

1. Activity type (message, reaction, etc.)
2. Direction via down arrow (incoming) or up arrow (outgoing)
3. Conversation type (for now, only personal chat is supported)
4. Sender
5. Timestamp.

### Monitor activity while testing Teams in browser

When testing your sideloaded app in the Teams web client, you can monitor activities in DevTools. Once your agent has launched, the agent server will indicate what port DevTools is running on). Open another browser tab and navigate to the DevTools Activities URL. Interact with your agent in the Teams web client and see the activities in DevTools. To learn more, review the [Agents Toolkit](../../teams/configuration/agents-toolkit) page.

You can filter activities by type using the filter icon in the Type column header.

### View activity details

Selecting an activity in the grid opens a detailed view in Preview mode, showing the full payload as a tree with expandable and collapsible sections.

### View activity JSON

Toggle from "Preview" to "JSON" under the "Activity details" header to see the raw JSON payload.

### Copy activity payload

Press the Copy button in the top right corner of the Activity details view to copy the payload to your clipboard.

### Inspect activities by ID

When in [Chat](chat), you can inspect activities by ID by clicking the magnifying glass icon in the message actions menu. This opens the Activities page with the activity ID filtered in the list, which is useful for inspecting streamed messages, which have multiple activities.

To reset the filter, use the filter button in the Type column header and de-select the activity ID to show all activities again.
