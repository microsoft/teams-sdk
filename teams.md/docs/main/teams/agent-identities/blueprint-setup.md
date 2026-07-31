---
sidebar_position: 3
title: Set up an Agentic Blueprint
summary: Review the preview resources and publishing stages required to make an Agentic Blueprint available in Teams.
---

# Set up an Agentic Blueprint

:::caution[Validation pending]
This page is a first draft of the preview setup model, not a production runbook. The complete workflow must be revalidated in a clean tenant before publication.
:::

An Agentic Blueprint requires identity resources, a hosted callback, a package that binds an Agentic User template to the blueprint, and tenant administration.

## Required resources

| Resource | Purpose |
| --- | --- |
| Agentic Blueprint application | Owns the reusable blueprint identity and runtime credential. |
| Blueprint service principal | Makes the blueprint available in the target tenant. |
| Runtime credential | Lets the hosted runtime authenticate as the blueprint. |
| Messaging callback | Receives messages and lifecycle activities. |
| Agentic User template package | Connects the Teams catalog entry to the blueprint. |
| Admin Center publication | Controls tenant availability and activation. |

## Before you begin

Collect:

- Target tenant ID.
- Blueprint client ID and application object ID.
- Blueprint service principal object ID.
- Public HTTPS messaging endpoint.
- Runtime credential or federated credential.
- Permission to publish and activate custom agents in Microsoft 365 Admin Center.

The messaging endpoint typically ends in `/api/messages`. It is a Bot Framework callback, not an OAuth redirect URI.

## Preview setup flow

1. Create an Agentic Blueprint application.
2. Create its service principal in the target tenant.
3. Configure the runtime credential.
4. Configure the public messaging callback.
5. Apply the required inheritable permissions for future Agentic Users.
6. Generate an Agentic User template package.
7. Upload the package through Microsoft 365 Admin Center.
8. Publish and activate the agent for the intended users.
9. Create an Agentic User instance in Teams.
10. Verify message and lifecycle delivery at the callback.

## Package shape

The candidate Admin Center flow uses an Agentic User template package:

```text
manifest.zip
├── manifest.json
├── agenticUserTemplateManifest.json
├── color.png
└── outline.png
```

The current experimental package uses the following provisional `agenticUserTemplateManifest.json` shape. Confirm the schema version and communication protocol against the supported publishing tooling before publication:

```json
{
  "id": "<agentic-user-template-id>",
  "schemaVersion": "0.1.0-preview",
  "agentIdentityBlueprintId": "<blueprint-client-id>",
  "communicationProtocol": "activityProtocol"
}
```

Use placeholders in source control and deployment documentation. Do not commit tenant credentials, client secrets, or live callback details.

## Publishing status

The supported relationship between template-only packages, combined bot/custom-engine packages, Teams catalog visibility, and Microsoft 365 title publication is still being finalized.

Until that decision is complete:

- Treat the Agent 365-generated template-only package as the candidate Admin Center path.
- Do not combine `bots` or `copilotAgents.customEngineAgents` into the blueprint-template package unless the platform explicitly requires it.
- Do not present Microsoft 365 title ingestion as equivalent to Teams catalog publication.
- Increment the manifest version for every republished package.
