---
sidebar_position: 6
summary: Build Teams tab apps with Graph integration, authentication, and remote agent function calling capabilities.
---

# Tabs

Tabs are host-aware webpages embedded in Microsoft Teams, Outlook, and Microsoft 365. Tabs are commonly implemented as Single Page Applications that use the Teams [JavaScript client library](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/using-teams-client-library) (TeamsJS) to interact with the app host.

Tab apps will often need to interact with remote services. They may need to fetch data from [Microsoft Graph](https://learn.microsoft.com/en-us/graph/overview) or invoke remote agent functions, using the [Nested App Authentication](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/authentication/nested-authentication) (NAA) and the [Microsoft Authentication Library](https://learn.microsoft.com/en-us/entra/identity-platform/msal-overview) (MSAL) to ensure user consent and to allow the remote service authenticate the user.

The `@microsoft/teams.client` package in this library builds on TeamsJS and MSAL to streamline these common scenarios. It aims to simplify:

- **Remote Service Authentication** through MSAL-based authentication and token acquisition.
- **Graph API Integration** by offering a pre-configured and type-safe Microsoft Graph client.
- **Agent Function Calling** by handling authentication and including app context when calling server-side functions implemented Teams SDK agents.
- **Scope Consent Management** by providing simple APIs to test for and request user consent.

## Resources
- [Tabs overview](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/what-are-tabs?tabs=personal)
- [Teams JavaScript client library](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/using-teams-client-library)
- [Microsoft Graph overview](https://learn.microsoft.com/en-us/graph/overview)
- [Microsoft Authentication Library (MSAL)](https://learn.microsoft.com/en-us/entra/identity-platform/msal-overview)
- [Nested App Authentication (NAA)](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/authentication/nested-authentication)


