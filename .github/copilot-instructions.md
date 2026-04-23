# Copilot Instructions

This is a TypeScript CLI tool (`teams`) for managing Microsoft Teams apps. It uses Commander.js for command parsing, MSAL for auth, and talks to TDP (Teams Developer Portal) APIs.

## Review Style

Be extremely concise — sacrifice grammar for brevity. Every comment MUST include an importance level prefix:

- **[CRITICAL]** — Bugs, security issues, data loss. Must fix.
- **[HIGH]** — Correctness, perf, or maintainability problems. Should fix.
- **[NIT]** — Style, naming, minor cleanup. Optional.

## Code Style

### TypeScript

- Strong, precise types are extremely important. Every interface, output shape, and function signature must be explicitly typed — never fall back to `Record<string, unknown>`, `any`, or untyped parameters when a concrete type is possible. Define dedicated interfaces for command options, JSON output shapes, and API responses.
- Avoid `as unknown as X` double-casts and `any` types. Prefer fixing the underlying type (adding a field to an interface, using a proper generic, etc.) over casting.
- Use `Intl.DateTimeFormat` via `formatDate()` from `src/utils/date.ts` for dates — no `moment` or `date-fns`.
- Use `picocolors` (`pc`) for terminal styling:
  - Success/username: `pc.bold(pc.green(...))`
  - Warning: `pc.yellow(...)`
  - Command hints: `pc.cyan(...)`
  - Labels: `pc.dim(...)`
  - Errors: `pc.red(...)`

### Logging & Errors

Use `logger` from `src/utils/logger.ts` for all output. Never use `console.log`/`console.error` directly (except inside `logger.ts` and `json-output.ts`).

- `logger.info(...)` — general output (stdout)
- `logger.warn(...)` — warnings (stderr)
- `logger.error(...)` — errors (stderr)
- `logger.debug(...)` — verbose-only, gated by `--verbose`

For error conditions, throw `CliError` from `src/utils/errors.ts`. Wrap command `.action()` handlers with `wrapAction()` — it catches `CliError` and unknown errors, routes to JSON or human output, and handles `ExitPromptError` gracefully.

### Spinners

Use `createSilentSpinner()` from `src/utils/spinner.ts` (not `createSpinner` from nanospinner directly). Pass `silent = true` when `--json` is active to suppress visual output. Always include descriptive text.

### CLI Options

- Prefix truly optional flags with `[OPTIONAL]` in their description.
- Do NOT mark as `[OPTIONAL]` if the value will be prompted interactively when not provided.

### Auto-Confirm (`--yes` / `-y`)

The `--yes` global flag skips interactive confirmation prompts (for CI/agent use). State is managed via `setAutoConfirm`/`isAutoConfirm` in `src/utils/interactive.ts`. Before any `confirm()` call, check `isAutoConfirm()` and accept the default action if true.

### JSON Output

Every command MUST support `--json` (boolean flag, marked `[OPTIONAL]`). Each command defines a typed output interface in its own file (e.g., `AppCreateOutput`). Use `outputJson()` from `src/utils/json-output.ts`. Guard all human output (`logger.info`, `outputCredentials`) with `if (!options.json)`. Skip interactive prompts in JSON mode — use defaults or require flags.

### Commander Patterns

- Use Commander's built-in features for global flags and hooks.
- Don't manually parse `process.argv` — use `.option()` on the program and access via `optsWithGlobals()` in `preAction` hooks.

### Code Reuse

- Check if a shared function already exists before implementing logic.
- Extract reusable logic into shared modules (`src/utils/`, action files like `manifest/actions.ts`, `secret/generate.ts`).
- Never duplicate business logic across interactive menus and CLI subcommands — both should call the same shared function.

### Build

Always run `npm run build` after changes — the CLI runs from `dist/`, not source. `tsc --noEmit` only type-checks. From the monorepo root, use `npx turbo build --filter=@microsoft/teams.cli`.

## Architecture

### AAD App Creation — Use TDP, Not Graph API

Create AAD apps via TDP's `/aadapp/v2` endpoint (`createAadAppViaTdp` in `src/apps/tdp.ts`), NOT via Graph API directly. TDP's backend creates the service principal server-side, which is required for single-tenant bot registration.

- `signInAudience`: Always `AzureADMultipleOrgs` (multi-tenant AAD app)
- `isSingleTenant`: Always `true` on bot registration (SFI requirement)
- TDP returns a different `id` than Graph's object ID — use `getAadAppByClientId` to look up the Graph object ID before calling `addPassword`
- Graph replication lag may require retries after TDP creates the app

### Tenant Cross-Validation

Any command that uses both MSAL (Teams login) and Azure CLI must call `ensureTenantMatch(account.tenantId)` from `src/utils/az-prompts.ts` before creating Azure resources. This throws `CliError("TENANT_MISMATCH", ...)` if `account.tenantId` (MSAL) differs from the Azure CLI's active tenant (`az account show`). The `status` command displays the match/mismatch but does not throw.

### Auth Client ID

Uses shared public client `7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0`. TDP's own web UI uses a different first-party client ID (`e1979c22`) which we cannot use for CLI auth.

### Credential Output

Always output `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` together. The `TENANT_ID` comes from `account.tenantId` (MSAL AccountInfo).

### Bot Location

- Detection uses `getBotLocation(token, botId)` in `src/apps/bot-location.ts` — calls `/botframework/{botId}`, 200 = "tm" (Teams-managed), 404 = "azure".
- Default location is Teams-managed, overridable via `--azure`/`--teams-managed` flags or `teams config set default-bot-location`.
- SSO URI must be `api://botid-{botId}` — Teams regex requires `botid-` prefix.
