---
sidebar_position: 3
summary: Use the Slack + Teams expert system to build bots that run on both Slack and Microsoft Teams from a single codebase, with AI-assisted development.
---

# Slack + Teams

[microsoft/slack-plus-teams](https://github.com/microsoft/slack-plus-teams) is a knowledge base for AI coding agents (Claude Code, Cursor, GitHub Copilot) that build bots targeting **both Slack and Microsoft Teams**. It's not a library — it's a collection of micro-expert files that teach your agent how to bridge the two platforms: Block Kit ↔ Adaptive Cards, identity and SSO mapping, divergent event and file APIs, and transport and deploy targets that work for both.

The Teams side targets `@microsoft/teams-ai` v2 — the same SDK these docs cover.

## When to use it

- You run a bot on Slack today and want to add Teams support (or vice versa).
- You maintain one codebase that serves both platforms.
- You're scoping a migration and need a clear picture of the gap between Slack and Teams APIs before writing code.

For Teams-only development, use the [`teams-dev` agent skill](./agent-skills) instead.

## What's inside

- **27 bridge experts** — every cross-platform conversion category, each with a GREEN/YELLOW/RED gap analysis.
- **53 platform experts** — 35 Teams + 18 Slack micro-experts covering SDKs, OAuth, modals, Web API, shortcuts, and more.
- **Three working TypeScript examples** — dual-platform bot, Slack-add-Teams, Teams-add-Slack.
- **Platform comparison guides** — [feature gaps](https://github.com/microsoft/slack-plus-teams/blob/main/docs/feature-gaps.md), [UI components](https://github.com/microsoft/slack-plus-teams/blob/main/docs/ui-components.md), [identity and auth](https://github.com/microsoft/slack-plus-teams/blob/main/docs/identity-and-auth.md), [infrastructure](https://github.com/microsoft/slack-plus-teams/blob/main/docs/infrastructure.md).

TypeScript / JavaScript is the Tier 1 language. Python adapts the same patterns; Java, C#, and REST-only stacks have dedicated guidance.

## Set it up

Tell your AI agent to read the onboarding playbook directly from GitHub:

```
Read https://raw.githubusercontent.com/microsoft/slack-plus-teams/main/ONBOARD.md
and treat any reference to `slack-plus-teams/<path>` as
`https://raw.githubusercontent.com/microsoft/slack-plus-teams/main/<path>`.
Then follow its steps for my project.
```

The playbook detects your stack and loads only the relevant experts on demand — no clone required, and content stays current with `main`.

**Prefer to work offline?** Clone alongside your project and point your agent at the local copy:

```bash
git clone https://github.com/microsoft/slack-plus-teams
```

```
Read slack-plus-teams/ONBOARD.md and follow its steps for my project.
```

See the [repo README](https://github.com/microsoft/slack-plus-teams#readme) for additional setup patterns across Claude Code, GitHub Copilot, and Cursor.
