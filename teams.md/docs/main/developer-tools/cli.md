---
sidebar_position: 1
summary: Comprehensive guide to the Teams CLI tool for creating, managing, and deploying Teams AI applications with simple command-line operations. Use this when you need to set up a new Teams AI agent or manage existing ones.
---

# Teams CLI

The Teams CLI was created with the intent of supporting developers by making common actions simple to implement with just a command line. The CLI overarching features are:

| Feature | Description |
|---------|-------------|
| `new` | Create a new Teams AI v2 agent by choosing a template that will be ready to run with one command line. |
| `config` | Add Microsoft 365 Agents Toolkit configuration files to your existing Teams AI v2 agent project. |
| `environment` | Manage multiple environments (e.g. dev, prod) and their keys for your agent. |

:::tip
With the CLI, you can enter `npx @microsoft/teams.cli <token-arguments> --help` at any command level to access information about the command, tokens, or required arguments.
:::

## Create an agent with one command line

```sh
npx @microsoft/teams.cli@latest new <typscript | csharp | python> <app-name> <optional>
```

The `new` token will create a brand new agent with `app-name` applied as the directory name and project name.

:::note
The name you choose may have case changes when applied; for example, "My App" would become "my-app' due to the requirements for `package.json` files.
:::

:::warning
Our Python SDK is currently in Public Preview. As a result, we have the CLI under a feature flag.
Please run the below command to enable this language.
:::

```sh
$env:ENABLE_EXPERIMENTAL_PYTHON_OPTIONS = 1
```

### Optional parameters

:::tip
Use command line `npx @microsoft/teams.cli --help` to see the latest options for all optional params.
:::

| Parameter | Description |
|-----------|-------------|
| `--template` | Ready-to-run templates that serve as a starting point depending on your scenario. Template examples include `ai`, `echo`, `graph`, and more. |
| `--start` | Run the agent immediately upon finishing the creation of the project. |
| `--toolkit` or `--atk` | Include the configuration files required to run the agent in the debugger via the [Microsoft 365 Agents Toolkit](https://github.com/OfficeDev/teams-toolkit) extension. Options include `basic`, `embed`, and `oauth`, and more may be added in the future. |
| `--client-id` | The app client id, if you already have deployed a resource. This will be added to the root `.env` file of the project. |
| `--client-secret` | The app client secret, if you already have deployed a resource. This will be added to the root `.env` file of the project. |

## Add Microsoft 365 Agents Toolkit configuration to existing agent

An existing project may also have the appropriate Microsoft 365 Agents Toolkit configuration files added by configuration name.

```bash
npx @microsoft/teams.cli config add <config-name>
```

| Configuration | Description |
|--------------|-------------|
| `atk.basic` | Basic Microsoft 365 Agents Toolkit configuration |
| `atk.embed` | Configuration for embedded Teams applications |
| `atk.oauth` | Configuration for OAuth-enabled applications |

Using this command will include
- `env`: folders for managing multiple environments
- `infra`: files for deployment and provisioning
- `.yml` files for tasks, launch, deployment, etc.

## Remove Agents Toolkit configuration files

```bash
npx @microsoft/teams.cli config remove <config-name>
```
