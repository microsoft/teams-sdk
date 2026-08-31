<!-- warning -->

:::info[Teams SDK 2.1 now available]
**Teams SDK 2.1** is now generally available, with native ASP.NET Core integration, agentic identity support, and a two-line migration path from Bot Framework v4.

- **Native ASP.NET Core integration** — your app is just an ASP.NET Core app. Standard DI, `ILogger`, and `IConfiguration` throughout, with typed activity handlers. A working bot is about 15 lines.
- **Agentic identity** — run your bot as an AI teammate in [Agent 365](https://learn.microsoft.com/microsoft-agent-365/) with its own identity, acting with the user's permissions.
- **Bot Framework v4 migration in two lines** — a compatibility package runs your existing `IBot` implementation on the new infrastructure unchanged.

You'll find **SDK 2.0 / SDK 2.1** tabs throughout this guide wherever the two versions differ. If you're starting a new project, use **SDK 2.1** — it's the recommended path going forward. Use the **SDK 2.0** tabs only when maintaining or migrating an existing 2.0 app. For the full overview, read the [Teams SDK 2.1 announcement](/blog/announcing-teams-sdk-dotnet-2-1), or jump straight to the [TeamsBot sample](https://github.com/microsoft/teams.net/tree/main/core/samples/TeamsBot).
:::
