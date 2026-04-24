# Conventions

## Git

Do not commit or push unless explicitly asked.

## Colors

Use picocolors for terminal styling.

- Success/username: `pc.bold(pc.green(...))`
- Warning: `pc.yellow(...)`
- Command hints: `pc.cyan(...)`
- Labels: `pc.dim(...)`
- Errors: `pc.red(...)`

## Dates

Use `Intl.DateTimeFormat` via `formatDate()` from `src/utils/date.ts`.

## Logging & Errors

Use `logger` from `src/utils/logger.ts` for all output. Never use `console.log`/`console.error` directly (except inside `logger.ts` and `json-output.ts`).

- `logger.info(...)` — general output (stdout)
- `logger.warn(...)` — warnings (stderr)
- `logger.error(...)` — errors (stderr)
- `logger.debug(...)` — verbose-only, gated by `--verbose`

For error conditions, throw `CliError` from `src/utils/errors.ts`:

```typescript
throw new CliError("AUTH_REQUIRED", "Not logged in.", "Run `teams login` first.");
```

Wrap command `.action()` handlers with `wrapAction()` — it catches `CliError` and unknown errors, routes to JSON or human output, and handles `ExitPromptError` gracefully. In interactive menus (not wrapped by `wrapAction`), catch errors inline with `logger.error()`.

**API helpers (`src/apps/`) must never log directly.** Functions like `updateAppDetails`, `uploadIcon`, and other API layer code should return metadata (e.g., `result.versionBumped`) instead of calling `logger`. Only command-layer code should log, because it knows whether the caller is in `--json` mode, has active spinners, etc. Logging from API helpers corrupts `--json` output and breaks spinner rendering.

## Spinners

Use `createSilentSpinner()` from `src/utils/spinner.ts` (not `createSpinner` from nanospinner directly). Pass `silent = true` when `--json` is active to suppress visual output. Always include descriptive text.

## TypeScript

Strong, precise types are extremely important. Every interface, output shape, and function signature must be explicitly typed — never fall back to `Record<string, unknown>`, `any`, or untyped parameters when a concrete type is possible. Define dedicated interfaces for command options, JSON output shapes, and API responses. Avoid `as unknown as X` double-casts and `any` types unless absolutely necessary. Prefer fixing the underlying type (adding a field to an interface, using a proper generic, etc.) over casting.

## CLI Options

Prefix truly optional flags with `[OPTIONAL]` in their description:

```typescript
.option("--env <path>", "[OPTIONAL] Path to .env file")
```

Do NOT mark as `[OPTIONAL]` if the value will be prompted interactively when not provided. Those are required inputs, just with an alternative input method.

## Auto-Confirm (`--yes` / `-y`)

The `--yes` global flag skips interactive confirmation prompts (for CI/agent use). State is managed via `setAutoConfirm`/`isAutoConfirm` in `src/utils/interactive.ts`. Before any `confirm()` call, check `isAutoConfirm()` and accept the default action if true.

## Code Reuse

Before implementing logic, check if a shared function already exists for it. Extract reusable logic into shared modules (e.g., `src/utils/`, action files like `manifest/actions.ts`, `secret/generate.ts`). Never duplicate business logic across interactive menus and CLI subcommands — both should call the same shared function.

## Build

Always run `npm run build` after changes — the CLI runs from `dist/`, not source. `tsc --noEmit` only type-checks. From the monorepo root, use `npx turbo build --filter=@microsoft/teams.cli`.

## JSON Output

Every command MUST support `--json` (boolean flag, marked `[OPTIONAL]`). Each command defines a typed output interface in its own file (e.g., `AppCreateOutput`). Use `outputJson()` from `src/utils/json-output.ts`. Guard all human output (`logger.info`, `outputCredentials`) with `if (!options.json)`. Skip interactive prompts in JSON mode — use defaults or require flags.

## Interactive Menus

Every interactive menu that uses `select()` to dispatch to subcommands **must** be wrapped in a `while (true)` loop. Without this, the menu exits after one action and the user gets thrown back to the parent menu instead of staying in context.

```typescript
// ✅ Correct — loops back to menu after subcommand completes
while (true) {
  try {
    const action = await select({ message: "...", choices: [...] });
    if (action === "back") return;
    // dispatch to subcommands...
  } catch (error) {
    if (error instanceof Error && error.name === "ExitPromptError") return;
    throw error;
  }
}

// ❌ Wrong — menu shows once, then exits to parent
try {
  const action = await select({ message: "...", choices: [...] });
  if (action === "back") return;
  // dispatch to subcommands...
} catch (error) { ... }
```

When adding a new interactive menu, also add a corresponding test in `tests/menu-loop.test.ts` verifying the loop behavior.

## Commander Patterns

Use Commander's built-in features for global flags and hooks. Don't manually parse `process.argv` — use `.option()` on the program and access via `optsWithGlobals()` in `preAction` hooks.

## Documentation

When adding or renaming commands, menu items, or features, update the corresponding docs. CLI docs live at `../../teams.md/docs/cli/`. Key files:
- `../../teams.md/docs/cli/commands/` — one `.md` per command/subcommand (autogenerated markers reflect `--help` output)
- `../../teams.md/docs/cli/commands/index.md` — command tree overview
- `../../teams.md/docs/cli/index.md` — landing page feature descriptions

## Testing

All new tests must follow a **red/green cycle**: write the test first, verify it fails against the broken code (red), then apply the fix and verify it passes (green). This ensures tests actually catch the bug they're designed for.

## Pre-PR Validation

Before creating a PR:
1. Run `npm run build` — ensures TypeScript compiles cleanly.
2. Run `npm run test` — runs unit tests (menu loop behavior, JSON output, etc.). These must all pass.
3. Run the agentic tests defined in `agentic-tests.md` — basic smoke tests (setup/act/assert) that verify the CLI works end-to-end. Execute each test scenario via `node dist/index.js <command>` (not the global `teams` command) and confirm expected output.

# Architecture Decisions

## AAD App Creation — Use TDP, Not Graph API

Create AAD apps via TDP's `/aadapp/v2` endpoint (`createAadAppViaTdp` in `src/apps/tdp.ts`), NOT via Graph API directly. TDP's backend creates the service principal server-side, which is required for single-tenant bot registration.

- `signInAudience`: Always `AzureADMultipleOrgs` (multi-tenant AAD app)
- `isSingleTenant`: Always `true` on bot registration (SFI requirement)
- TDP returns a different `id` than Graph's object ID — use `getAadAppByClientId` to look up the Graph object ID before calling `addPassword`
- Graph replication lag may require retries after TDP creates the app

## Tenant Cross-Validation

Any command that uses both MSAL (Teams login) and Azure CLI must call `ensureTenantMatch(account.tenantId)` from `src/utils/az-prompts.ts` before creating Azure resources. This throws `CliError("TENANT_MISMATCH", ...)` if `account.tenantId` (MSAL) differs from the Azure CLI's active tenant (`az account show`). The `status` command displays the match/mismatch but does not throw.

## Auth Client ID

Uses shared public client `7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0`. TDP's own web UI uses a different first-party client ID (`e1979c22`) which we cannot use for CLI auth.

## Credential Output

Always output `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` together. The `TENANT_ID` comes from `account.tenantId` (MSAL AccountInfo).
