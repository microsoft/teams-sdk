# Teams Developer CLI

[![npm version](https://img.shields.io/npm/v/@microsoft/teams.cli.svg)](https://www.npmjs.com/package/@microsoft/teams.cli)

Teams Developer CLI helps you create, configure, and manage Microsoft Teams apps from the command line. Use it to scaffold projects, register Teams apps and bots, manage manifests and packages, configure authentication, and automate common app lifecycle tasks.

## Install

```bash
npm install -g @microsoft/teams.cli
```

## Usage

```bash
teams
```

This launches the interactive CLI. You can also run commands directly for scripting and automation.

## Documentation

For command reference, guides, and examples, see:

https://aka.ms/teamscli

## Automation

Use these options for CI and agent workflows:

| Flag                    | Description                            |
| ----------------------- | -------------------------------------- |
| `--json`                | Output structured JSON where supported |
| `--yes` / `-y`          | Skip confirmation prompts              |
| `--disable-auto-update` | Disable automatic update checks        |
| `-v, --verbose`         | Enable verbose logging                 |

Set `TEAMS_NO_INTERACTIVE=1` to disable interactive prompts entirely.

## Optional installation telemetry (MVP)

Telemetry is off by default. Production collection is source-gated off pending
privacy/enrollment approval and sender onboarding, even after opting in.

```bash
teams config set telemetry on
teams config set telemetry off
teams config get telemetry --json
```

The MVP observes only best-effort npm `postinstall` executions for previously
enrolled installations. It does not collect CLI command usage, authentication,
project/attempt correlation, identity joins, or confirmed install/message/reply
milestones. A fresh install has no prior consent and sends nothing. After opting
in, a subsequent install/upgrade or `npm rebuild @microsoft/teams.cli` runs the hook.
Lifecycle scripts must be enabled.

The only event is `teams.cli.postinstall`: schema/CLI version, OS, random
installation/invocation IDs, and timestamp. Names, arguments, paths, URLs,
credentials, raw errors, and machine identity are not included. Consent and the
installation ID live separately from auth/config in `telemetry-v1.json` in the
CLI's platform data directory. Opt-out removes that ID; re-enrollment starts a
new identity. No event queue is persisted. An abandoned `telemetry-v1.json.lock`
directory can be removed only when no CLI/npm processes are using it.

`DO_NOT_TRACK=1` or `TEAMS_CLI_TELEMETRY_OPTOUT=1` veto collection. Hook failures
are silent and cannot fail installation. Export has a 500 ms budget, with an
850 ms bootstrap ceiling; slow or interrupted hooks may lose events. The private
candidate sender has no retries, automatic instrumentation, or background uploader.
Privacy: https://privacy.microsoft.com/privacystatement

### Test npm installation locally

From the monorepo root:

```bash
npm run test:telemetry:install --workspace=@microsoft/teams.cli
```

This builds the CLI and creates a **private disposable test package**, enabling
the release gate only in that copy. It installs the tarball into an isolated
profile, verifies no event before consent, opts in, rebuilds to collect one event
at a loopback endpoint, checks the environment veto, then opts out and rebuilds
again. The real sender/serialization is used; only destination resolution is
substituted. Cached npm dependencies are required (`npm install --offline`).
Source, normal build output, and your real CLI profile are unchanged.

For an explicitly approved Application Insights test resource, set
`TEAMS_CLI_TELEMETRY_CONNECTION_STRING` to its full connection string
(`InstrumentationKey=...;IngestionEndpoint=https://.../`) in your environment,
unset both veto variables, and run:

```bash
npm run test:telemetry:install --workspace=@microsoft/teams.cli -- --live
```

Live mode uses the unmodified HTTPS sender. It prints a random test installation
ID; verify ingestion in Application Insights rather than treating npm success as
delivery confirmation:

```kusto
traces
| where message == "teams.cli.postinstall"
| where tostring(customDimensions.installationId) == "<printed test installation ID>"
```

With workspace-native tables, use `AppTraces`, `Message`, and `Properties`.
Never commit a connection string or publish the test-enabled artifact.

## AI Agent Skills

Use Teams developer skills to help AI assistants manage Teams bot infrastructure:

https://aka.ms/Teams-Skills

## Issues

Run `teams feedback` to open the CLI issue form on GitHub and submit feedback.
The form is prefilled with your CLI version and Node.js version. Select your operating system and install method manually.
In remote or non-interactive sessions, the command prints the link instead.
Use `teams feedback --json` to return the URL without opening a browser.

You can also report CLI issues at https://aka.ms/teams-cli-issues.

## License

MIT
