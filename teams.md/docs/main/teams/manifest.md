---
sidebar_position: 5
summary: Learn about Teams app manifest requirements, permissions, and sideloading process for app installation.
---

# Teams Manifest

Every app or agent installed on Teams requires an app manifest json file, which provides important information and permissions to that app. When sideloading the app, you are required to provide the app manifest via zip which also includes the icons for the app.

## Manifest

There are many permissions and details that an app manifest may have added to the `manifest.json`, including the app ID, url, and much more. Please review the comprehensive documentation on the [manifest schema](https://learn.microsoft.com/microsoft-365/extensibility/schema/).

## Sideloading

Sideloading is the ability to install and test your app before it is published to your organization's app catalog. For more on sideloading, see [Upload your apps to Teams](https://learn.microsoft.com/microsoftteams/platform/concepts/deploy-and-publish/apps-upload).

To sideload, ensure the manifest includes all required information (such as the app ID, tenant details, and permissions). Place the manifest and icons at the root of a zip file.

For convenient assistance with managing your manifest and automating important functionality like sideloading, deployment, and provisioning, we recommend the [Microsoft 365 Agents Toolkit extension](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/install-teams-toolkit)) and [CLI](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/microsoft-365-agents-toolkit-cli). Please continue to the [Toolkit documentation](./configuration/agents-toolkit) to learn more.
