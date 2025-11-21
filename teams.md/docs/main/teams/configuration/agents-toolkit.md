---
sidebar_position: 1
summary: Automate Teams app development with Microsoft 365 Agents Toolkit for manifest management, sideloading, and deployment.
---

# Microsoft 365 Agents Toolkit

Microsoft 365 Agents Toolkit provides a powerful VS Code extension and CLI tool that helps automate important tasks like provisioning and deployment. The project is maintained separately in this repository - [Agents Toolkit GitHub repository](https://github.com/OfficeDev/microsoft-365-agents-toolkit).

## Installing Agents Toolkit

Agents Toolkit can be installed as an extension and CLI. Please see the documentation linked below.

- [Installing Agents Toolkit extension](https://learn.microsoft.com/microsoftteams/platform/toolkit/install-teams-toolkit)
- [Installing Agents Toolkit CLI](https://learn.microsoft.com/microsoftteams/platform/toolkit/microsoft-365-agents-toolkit-cli)

:::note

- [Teams SDK CLI](../../developer-tools/cli) - helper for Teams SDK. It scaffolds agents, wires in deep Teams features (Adaptive Cards, Conversation History, Memory...etc), and adds all the config files you need while you're coding.
- Agents Toolkit CLI - app deployment helper. It sideloads, provisions Azure resources, handles manfiest/tenant plumbing, and keeps your dev, test, and prod environments in sync.
  :::

## Official documentation

Refer to the official [Microsoft 365 Agents Toolkit documentation](https://learn.microsoft.com/microsoft-365/developer/overview-m365-agents-toolkit?toc=%2Fmicrosoftteams%2Fplatform%2Ftoc.json&bc=%2Fmicrosoftteams%2Fplatform%2Fbreadcrumb%2Ftoc.json) on Microsoft Learn.

## Deployment and provisioning

Generally, you can use the toolkit to add required resources to Azure based on your app manifest setup. For more, see [Add cloud resources and API connection](https://learn.microsoft.com/microsoftteams/platform/toolkit/add-resource).

## Resources

- [Microsoft 365 Agents Toolkit](https://learn.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals): Extensive documentation covering usage and supported scenarios of Agents Toolkit.
- [Teams SDK CLI documentation](../../developer-tools/cli): Instructions on adding Agents Toolkit configurations to your Teams SDK agent.
