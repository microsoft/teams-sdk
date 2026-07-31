---
sidebar_position: 1
title: Agent identities overview
summary: Understand how one Teams SDK blueprint can power multiple Agentic Users with distinct identities, state, and permissions.
---

# Agent identities overview

:::warning[Preview]
Agent identity support is in preview. The TypeScript APIs described here are planned for a future preview package and are not available in the current stable packages. API names, provisioning steps, supported authentication methods, and platform requirements may change before general availability.
:::

Agent identities let one Teams SDK application run as a reusable **blueprint** for multiple concrete **Agentic Users**. Each Agentic User uses the same application code while maintaining its own identity, configuration, state, permissions, and conversation history.

For example, one project-management blueprint could power separate Agentic Users for a mobile redesign, billing migration, and conference launch. The runtime is shared, but each Agentic User acts as a distinct participant.

## Core concepts

| Concept | Purpose |
| --- | --- |
| Agentic Blueprint | The reusable application registration, credentials, callback, and runtime code. |
| Agentic App Instance | The app-like identity for one concrete instance of the blueprint. |
| Agentic User | The user-shaped identity that receives messages and sends activities. |
| Agentic User ID | The Entra object ID of the Agentic User. |
| Agentic App Instance ID | The client ID used for the concrete instance during token exchange. |

The blueprint is not a fallback conversational identity. Messages and proactive activities for an instantiated blueprint must be sent as a concrete Agentic User.

## Supported scenarios

- Handle messages sent to different Agentic Users in one hosted runtime.
- Reply reactively as the Agentic User that received the activity.
- Select an Agentic User explicitly for proactive messaging after the preview sender-envelope blocker is resolved.
- Scope Bot API clients and tokens to an Agentic User.
- Subscribe to Agentic User lifecycle events.
- Store configuration and state by Agentic User ID.

## SDK availability

| SDK | Documentation status |
| --- | --- |
| TypeScript | Initial preview draft |
| Python | Pending API validation |
| C# | Pending API validation |

:::caution[Proactive messaging blocker]
The current preview implementation scopes proactive token acquisition to the Agentic User, but its serialized sender identity is still under correction. Treat proactive messaging as design guidance until that blocker is resolved and validated.
:::

## Next steps

- [Understand the architecture](./architecture)
- [Review blueprint setup](./blueprint-setup)
- [Build with Agentic Users in TypeScript](/typescript/in-depth-guides/agent-identities/)
- [Troubleshoot agent identities](./troubleshooting)
