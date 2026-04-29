---
slug: teams-cli-preview
title: "From Prompt to Production: Teams Agent Setup, Simplified"
date: 2026-04-28
authors:
  - name: Aamir Jawaid
    title: Microsoft
    url: https://github.com/heyitsaamir
    image_url: https://github.com/heyitsaamir.png
  - name: Kavin Singh
    title: Microsoft
    url: https://github.com/singhk97
    image_url: https://github.com/singhk97.png
  - name: Umang Sehgal
    title: Microsoft
    url: https://github.com/umangsehgal
    image_url: https://github.com/umangsehgal.png
tags: [teams-sdk, cli, preview, announcement, skills]
description: Introducing the teams-dev agent skill and the Teams CLI v3 Preview for registering and building Teams agents.
image: /img/blog-teams-cli-preview-hero.png
---

You want to build a Teams agent. Maybe it answers customer questions from a knowledge base. Maybe it runs your team's standups. The interesting part is the logic, the thing the agent actually *does*.

But before you write a single line of that logic, you have to register it with Teams. That takes a number of steps.

<!-- truncate -->

## How It Works Today

Getting an agent into Teams requires configuring an identity, generating credentials, authoring a manifest, and wiring it all together. These steps span the Azure portal, Developer Portal, and your editor. Each one is straightforward on its own, but the context-switching between them adds up.

<div style={{textAlign: 'center'}}>
<img src={require('./setup-steps.png').default} alt="The 9 steps required to register a Teams agent today" style={{maxHeight: '400px'}} />
</div>

## Let Your Coding Agent Handle It

The [`teams-dev` agent skill](/developer-tools/agent-skills) works with AI coding agents like Copilot, Claude Code, and Cursor. Instead of learning the registration steps yourself, tell your coding agent:

- *"Help me build a Teams agent that answers FAQs"*
- *"Get my agent running in Teams"*
- *"My agent isn't loading in Teams, can you help?"*

![The teams-dev agent skill in action](./agent-skill.gif)

The skill uses the CLI under the hood to handle the full infrastructure workflow, from login to a working agent in Teams, and troubleshooting when something breaks. Beyond infrastructure, it also helps your coding agent write application logic following best practices from the Teams SDK documentation.

## Under the Hood: The Teams CLI

For developers who want direct control, the skill is powered by the next iteration of our CLI. Install it and log in:

```bash
npm install -g @microsoft/teams.cli@preview
teams login
```

### Create Is Now Just One Command

```bash
teams app create --name "My Bot" --endpoint https://my-bot.example.com/api/messages --env .env
```

`teams app create` does the heavy lifting (registration, credentials, manifest, and more) so you can start building immediately. All the steps from above happen behind the scenes.

![Showcasing how a single command is able to set up your entire agent infra](./app-create.gif)

Now you can focus on your agent's logic without worrying about app registration concepts. See the [CLI docs](/cli/) for all available flags.

### Easy Installation

Traditionally, getting an agent into Teams means building an app package, managing a manifest, and sideloading it. With the CLI, `app create` gives you an installation link. Open it and Teams handles the install flow without a manual zip/package upload.

![Teams install dialog from the installation link](./install-link.png)

The CLI also includes a `teams app doctor` command that checks your agent's registration, credentials, endpoint, and manifest so when something breaks, you know exactly what to fix.

For CI pipelines and custom tooling, every CLI command supports `--json` output for programmatic consumption.

## Get Started

Install the `teams-dev` agent skill (Copilot, Claude Code, Cursor):

```
/plugin marketplace add microsoft/teams-sdk
/plugin install teams-sdk@teams-skills
```

See the [agent skills guide](/developer-tools/agent-skills) for VS Code and other editors.

Install the CLI:

```bash
npm install -g @microsoft/teams.cli@preview
```

Full docs at [microsoft.github.io/teams-sdk/cli](https://microsoft.github.io/teams-sdk/cli/). File issues at [github.com/microsoft/teams-sdk](https://github.com/microsoft/teams-sdk/issues).
