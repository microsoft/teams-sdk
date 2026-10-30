import { input, select } from '@inquirer/prompts';
import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pc from 'picocolors';
import {
  AGENT_GITIGNORE_ENTRIES,
  appendAgentUser,
  ensureGitignoreEntries,
  getGeneratedConfigPath,
  readGeneratedConfig,
  updateGeneratedConfig,
  writeGeneratedConfig,
  type AgentGeneratedConfig,
} from '../../../apps/agent-config.js';
import { agentChatLink } from '../../../apps/links.js';
import { writeCredentials } from '../../../utils/env.js';
import { printLinkBanner } from '../../../utils/browser.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { confirmAction, isInteractive } from '../../../utils/interactive.js';
import { outputJson } from '../../../utils/json-output.js';
import { logger } from '../../../utils/logger.js';
import { assertHttpsEndpoint, registerAgentBlueprintEndpoint, runCreateAgentBlueprint } from '../blueprint/actions.js';
import {
  requireAgentAccount,
  resolveAgentName,
  resolveGraphPermissionsDefault,
  resolveLicenseDefault,
  resolveUsageLocationDefault,
} from '../shared.js';
import { resolveExistingBlueprint, runCreateAgentIdentity, runCreateAgenticUser } from './actions.js';

export interface AgentUserCreateOptions {
  json?: boolean;
  /** [OPTIONAL] Name for a newly created blueprint. Only valid when no `blueprintId` argument is given. */
  blueprintName?: string;
  /** [OPTIONAL] Display name for the agentic user. Defaults to the blueprint's name when omitted. */
  userName?: string;
  /** [OPTIONAL] HTTPS messaging endpoint to register on a newly created blueprint. Only valid when no `blueprintId` argument is given. */
  endpoint?: string;
  /** [OPTIONAL] License SKU ID or part number to assign to the agentic user, skipping the interactive picker.
   * `false` when `--no-license` was passed, to explicitly skip assignment (Commander maps `--license <skuId>`
   * and `--no-license` onto this same property). */
  license?: string | false;
  /** [OPTIONAL] Two-letter country code to use as the agentic user's usage location, skipping detection/confirmation. */
  usageLocation?: string;
  /** [OPTIONAL] Working directory for the generated config file. Defaults to process.cwd(). */
  cwd?: string;
  /** [OPTIONAL] Internal: skips the "reuse an existing blueprint vs create a new one" prompt and always creates a
   * brand new blueprint. Used by `teams project new`, where a freshly scaffolded project never has one to reuse. */
  forceNewBlueprint?: boolean;
  /** [OPTIONAL] Internal: additional, language-specific file to also write CLIENT_ID/CLIENT_SECRET/TENANT_ID to
   * (e.g. a C# project's `appsettings.Development.json`). Used by `teams project new`. `.env` in `cwd` is always
   * written too, regardless of this option, since it's what a later run in the same folder reads back from to
   * reuse the blueprint's client secret. */
  credentialPath?: string;
}

export interface AgentUserCreateOutput {
  agentBlueprintId: string;
  agentIdentityId: string;
  agenticUserId: string;
  userPrincipalName: string;
  generatedConfigPath: string;
  /** Deep link that opens a 1:1 chat with the agentic user in Teams. */
  chatLink: string;
  /** Additional language-specific file the credentials were also written to (e.g. `appsettings.Development.json`), when different from `.env`. */
  credentialsFile?: string;
  /** Messaging endpoint registered on a newly created blueprint, if provided. */
  messagingEndpoint?: string;
  /** True when no local blueprint secret was found and Graph minted a fresh one for this run. */
  secretMinted?: boolean;
  /** True when a license was assigned automatically (the user picked one interactively). */
  licenseAssigned?: boolean;
  /** `skuPartNumber` of the license assigned, when `licenseAssigned` is true. */
  licenseSkuPartNumber?: string;
  /** True when no license was assigned (no interactive session, no available seats, or the call failed) and still needs to be done manually. */
  needsLicense?: boolean;
}

export function renderAgentUserCreateResult(output: AgentUserCreateOutput): void {
  logger.info('');
  logger.info(`${pc.dim('Agent blueprint ID:')} ${output.agentBlueprintId}`);
  logger.info(`${pc.dim('Agent identity ID:')} ${output.agentIdentityId}`);
  logger.info(`${pc.dim('Agentic user object ID:')} ${output.agenticUserId}`);
  logger.info(`${pc.dim('Agentic user UPN:')} ${output.userPrincipalName}`);
  logger.info(`${pc.dim('Generated config:')} ${output.generatedConfigPath}`);
  if (output.messagingEndpoint) {
    logger.info(`${pc.dim('Messaging endpoint:')} ${output.messagingEndpoint}`);
  }
  if (output.credentialsFile) {
    logger.info(`${pc.dim('Credentials file:')} ${output.credentialsFile}`);
  }
  if (output.secretMinted) {
    logger.info(
      pc.dim(
        'Note: no local client secret was found for this blueprint, so a new one was minted and saved to .env in this folder.'
      )
    );
  }
  if (output.licenseAssigned) {
    logger.info(pc.dim(`License ${output.licenseSkuPartNumber ?? ''} assigned.`.trim()));
  }
  if (output.needsLicense) {
    logger.info(
      pc.dim(
        'Note: no license was assigned. The agentic user needs a Microsoft 365 license with Teams/Exchange capability to be usable -- assign one manually in the Entra admin center.'
      )
    );
  }
  logger.info('');
  printLinkBanner('Chat with agent in Teams', output.chatLink);
}


/**
 * Resolves the blueprint ID to use when none was passed as an argument.
 *
 * - If `cwd` already has `agent.generated.config.json` (from a prior
 *   `teams agent blueprint create`/`teams agent user create` run), asks
 *   to confirm reusing that blueprint.
 * - If there's no local config, or the user declines reusing it, offers a
 *   choice: type in an existing blueprint ID, or create a brand new
 *   blueprint (returns `undefined`, telling the caller to create one).
 * - In silent/non-interactive mode, returns the local config's blueprint
 *   ID if present, otherwise `undefined` (caller creates a new blueprint).
 */
async function resolveBlueprintIdForUserCreate(cwd: string, silent: boolean): Promise<string | undefined> {
  const localConfig = existsSync(getGeneratedConfigPath(cwd)) ? tryReadGeneratedConfig(cwd) : undefined;

  if (localConfig?.agentBlueprintId) {
    const useLocal = await confirmAction(
      `Use blueprint ${pc.cyan(localConfig.agentBlueprintId)} (${localConfig.agentBlueprintName}) from agent.generated.config.json?`,
      silent
    );
    if (useLocal) return localConfig.agentBlueprintId;
  }

  if (silent || !isInteractive()) return undefined;

  const choice = await select({
    message: 'Agent blueprint:',
    choices: [
      { name: 'Enter an existing blueprint ID', value: 'existing' as const },
      { name: 'Create a new blueprint', value: 'new' as const },
    ],
  });
  if (choice === 'new') return undefined;

  const entered = await input({ message: 'Agent blueprint ID:' });
  if (!entered.trim()) {
    throw new CliError('AGENT_BLUEPRINT_ID_REQUIRED', 'Agent blueprint ID cannot be empty.');
  }
  return entered.trim();
}

/**
 * Resolves the display name for the agentic user itself, distinct from
 * the blueprint's name -- a blueprint can be reused across many agentic
 * users, so defaulting (and prompting) separately avoids silently naming
 * every agentic user after whichever blueprint happened to be used.
 * `--user-name` always wins; defaults to the blueprint name when
 * non-interactive/silent and no override was given.
 */
async function resolveAgenticUserName(
  agentBlueprintName: string,
  userNameOverride: string | undefined,
  silent: boolean
): Promise<string> {
  if (userNameOverride?.trim()) return userNameOverride.trim();
  if (silent || !isInteractive()) return agentBlueprintName;

  const name = await input({ message: 'Agentic user name:', default: agentBlueprintName });
  return name.trim() || agentBlueprintName;
}

/**
 * Asks for the messaging endpoint right after creating a brand new
 * blueprint, mirroring `teams agent blueprint create`'s own prompt.
 * Skipped when reusing an existing blueprint (it already has whatever
 * endpoint it was set up with). `--endpoint` wins when given; otherwise
 * optional -- pressing enter (or running non-interactively) skips it.
 */
async function resolveOptionalEndpoint(endpointFlag: string | undefined, silent: boolean): Promise<string | undefined> {
  if (endpointFlag?.trim()) return endpointFlag.trim();
  if (silent || !isInteractive()) return undefined;

  const endpoint = await input({
    message: 'Messaging endpoint (HTTPS URL, press enter to skip and set it later):',
  });
  return endpoint.trim() || undefined;
}

function tryReadGeneratedConfig(cwd: string): AgentGeneratedConfig | undefined {
  try {
    return readGeneratedConfig(cwd);
  } catch {
    return undefined;
  }
}

/**
 * One-shot command: `teams agent user create [blueprintId]` creates
 * everything needed for an Agent 365 agentic user.
 *
 * - With `blueprintId`: reuses the existing blueprint (local secret fast
 *   path, or a freshly minted Graph secret if run outside the folder that
 *   created it).
 * - Without it: checks `cwd` for a local blueprint to reuse (confirming
 *   first), otherwise offers to enter an existing blueprint ID or create
 *   a brand new one, exactly like `teams agent blueprint create`.
 *
 * Either way, it then creates the agent identity and the agentic user,
 * chaining all three Graph calls in one run, and (re)writes
 * `agent.generated.config.json`/`.env` in `cwd` for the resolved
 * blueprint so a later run in the same folder gets the fast path.
 */
export async function runAgentUserCreate(
  blueprintIdArg: string | undefined,
  options: AgentUserCreateOptions,
  /** Pre-resolved agent name, for callers (e.g. `teams project new`) that already prompted for it. */
  nameArg?: string,
  /** [OPTIONAL] Pre-fill for the "Blueprint name:" prompt when a new blueprint is created (e.g. the enclosing project's name), still editable by the user. Only used when `nameArg` is omitted and no existing blueprint is reused. */
  nameDefault?: string
): Promise<AgentUserCreateOutput> {
  const silent = !!options.json;
  const cwd = options.cwd ?? process.cwd();

  if (options.endpoint?.trim()) {
    assertHttpsEndpoint(options.endpoint.trim());
  }

  const account = await requireAgentAccount(silent);

  let agentName: string;
  let agentBlueprintId: string;
  let agentBlueprintObjectId: string;
  let agentBlueprintServicePrincipalObjectId: string;
  let clientSecret: string;
  let secretMinted = false;
  let messagingEndpoint: string | undefined;
  /** Graph scopes granted/made inheritable on a brand-new blueprint, resolved from `agent-default-permissions`. Unset when reusing an existing blueprint. */
  let newBlueprintGraphPermissions: string[] | undefined;

  const resolvedBlueprintId =
    blueprintIdArg ?? (options.forceNewBlueprint ? undefined : await resolveBlueprintIdForUserCreate(cwd, silent));

  // Creation-only flags only make sense for a brand new blueprint -- reject them against
  // whichever blueprint actually got resolved (an explicit `[blueprintId]` argument, or one
  // reused from this folder's local config), not just the explicit argument.
  if (resolvedBlueprintId && nameArg) {
    throw new CliError(
      'VALIDATION_CONFLICT',
      '`--blueprint-name` is ignored when reusing an existing blueprint.',
      blueprintIdArg
        ? 'Drop `--blueprint-name`, or omit `[blueprintId]` to create a new blueprint with that name.'
        : 'Drop `--blueprint-name`, or decline reusing the local blueprint when prompted to create a new one instead.'
    );
  }
  if (resolvedBlueprintId && options.endpoint) {
    throw new CliError(
      'VALIDATION_CONFLICT',
      '`--endpoint` is ignored when reusing an existing blueprint.',
      'Drop `--endpoint`, or use `teams agent blueprint update --endpoint <url>` to change an existing blueprint\u2019s endpoint.'
    );
  }

  if (resolvedBlueprintId) {
    const resolved = await resolveExistingBlueprint(resolvedBlueprintId, cwd, account, silent);
    agentName = resolved.agentBlueprintName;
    agentBlueprintId = resolved.agentBlueprintId;
    agentBlueprintObjectId = resolved.agentBlueprintObjectId;
    agentBlueprintServicePrincipalObjectId = resolved.agentBlueprintServicePrincipalObjectId;
    clientSecret = resolved.clientSecret;
    secretMinted = resolved.secretMinted;
  } else {
    agentName = await resolveAgentName(nameArg, silent, nameDefault);
    const graphScopes = await resolveGraphPermissionsDefault(undefined, silent);
    const blueprint = await runCreateAgentBlueprint(agentName, account, silent, graphScopes);
    agentBlueprintId = blueprint.agentBlueprintId;
    agentBlueprintObjectId = blueprint.agentBlueprintObjectId;
    agentBlueprintServicePrincipalObjectId = blueprint.agentBlueprintServicePrincipalObjectId;
    clientSecret = blueprint.agentBlueprintClientSecret;
    newBlueprintGraphPermissions = blueprint.graphPermissions;
  }

  // Persist the blueprint's config/credentials as soon as they exist -- before the optional
  // endpoint work below, which can fail or prompt for invalid input -- so a retry after that
  // reuses this blueprint via the fast path above instead of minting another one.
  //
  // When this folder already has a config for the same blueprint (e.g. reusing an existing
  // blueprint, or a second `teams agent user create` in the same folder), preserve its
  // `agentUsers`/`graphPermissions`/`messagingEndpoint` instead of clobbering them.
  const existingConfig = existsSync(getGeneratedConfigPath(cwd)) ? readGeneratedConfig(cwd) : undefined;
  const preservedConfig = existingConfig?.agentBlueprintId === agentBlueprintId ? existingConfig : undefined;

  const config: AgentGeneratedConfig = {
    ...preservedConfig,
    agentBlueprintName: agentName,
    agentBlueprintId,
    agentBlueprintObjectId,
    agentBlueprintServicePrincipalObjectId,
    ...(newBlueprintGraphPermissions?.length ? { graphPermissions: newBlueprintGraphPermissions } : {}),
    completedAt: new Date().toISOString(),
  };
  writeGeneratedConfig(cwd, config);

  const envPath = join(cwd, '.env');
  const credentials = {
    CLIENT_ID: agentBlueprintId,
    CLIENT_SECRET: clientSecret,
    TENANT_ID: account.tenantId,
  };
  writeCredentials(envPath, credentials);
  // `.env` is always kept up to date above regardless of `credentialPath`, since it's what a later
  // run in this folder reads back from (via `resolveExistingBlueprint`) to reuse the blueprint's
  // client secret. When the caller (e.g. `teams project new` for a C# project) wants the credentials
  // in a different, language-specific file too, also write there.
  const extraCredentialPath =
    options.credentialPath && resolve(options.credentialPath) !== resolve(envPath)
      ? options.credentialPath
      : undefined;
  if (extraCredentialPath) {
    writeCredentials(extraCredentialPath, credentials);
  }
  ensureGitignoreEntries(cwd, ['.env', ...AGENT_GITIGNORE_ENTRIES]);

  // Endpoint registration only applies to a brand new blueprint -- validated against reuse earlier.
  // Done after the config/credentials above are already persisted, and patched in afterward on
  // success, so a failure here doesn't lose the blueprint IDs/secret just saved.
  if (!resolvedBlueprintId) {
    messagingEndpoint = await resolveOptionalEndpoint(options.endpoint, silent);
    if (messagingEndpoint) {
      assertHttpsEndpoint(messagingEndpoint);
      await registerAgentBlueprintEndpoint(agentBlueprintId, account.tenantId, messagingEndpoint, silent);
      updateGeneratedConfig(cwd, { messagingEndpoint });
    }
  }


  const identity = await runCreateAgentIdentity(agentName, agentBlueprintId, clientSecret, account, silent);
  const agenticUserName = await resolveAgenticUserName(agentName, options.userName, silent);
  const licenseOption = await resolveLicenseDefault(options.license, silent);
  const usageLocationOption = await resolveUsageLocationDefault(options.usageLocation, silent);
  const user = await runCreateAgenticUser(
    agenticUserName,
    identity.agentIdentityId,
    account,
    silent,
    licenseOption,
    usageLocationOption,
    // Persisted as soon as the Graph user exists, before license assignment is attempted --
    // an invalid/seat-less `--license` throws afterward, and a retry must see this user already
    // recorded locally instead of hitting a duplicate-UPN error against it.
    (created) =>
      appendAgentUser(cwd, {
        agentIdentityId: identity.agentIdentityId,
        agenticUserId: created.agenticUserId,
        agenticUserName,
        userPrincipalName: created.userPrincipalName,
      })
  );

  const output: AgentUserCreateOutput = {
    agentBlueprintId,
    agentIdentityId: identity.agentIdentityId,
    agenticUserId: user.agenticUserId,
    userPrincipalName: user.userPrincipalName,
    generatedConfigPath: getGeneratedConfigPath(cwd),
    chatLink: agentChatLink(user.userPrincipalName),
    ...(extraCredentialPath ? { credentialsFile: extraCredentialPath } : {}),
    ...(messagingEndpoint ? { messagingEndpoint } : {}),
    ...(secretMinted ? { secretMinted: true } : {}),
    ...(user.licenseAssigned ? { licenseAssigned: true } : {}),
    ...(user.licenseSkuPartNumber ? { licenseSkuPartNumber: user.licenseSkuPartNumber } : {}),
    ...(user.needsLicense ? { needsLicense: true } : {}),
  };

  if (options.json) {
    outputJson(output);
    return output;
  }

  renderAgentUserCreateResult(output);
  return output;
}

export const agentUserCreateCommand = new Command('create')
  .description('Create an Agent 365 agentic user (and its identity + blueprint if needed)')
  .argument('[blueprintId]', '[OPTIONAL] Existing agent blueprint ID to reuse. Creates a new blueprint if omitted.')
  .option(
    '--blueprint-name <name>',
    '[OPTIONAL] Name for a newly created blueprint. Not valid together with [blueprintId].'
  )
  .option('--user-name <name>', "[OPTIONAL] Display name for the agentic user. Defaults to the blueprint's name.")
  .option(
    '--endpoint <url>',
    '[OPTIONAL] HTTPS messaging endpoint to register on a newly created blueprint. Not valid together with [blueprintId].'
  )
  .option('--license <skuId>', '[OPTIONAL] License SKU ID or part number to assign to the agentic user. Falls back to `teams config` default-license when omitted.')
  .option('--no-license', '[OPTIONAL] Skip license assignment (do it manually later)')
  .option(
    '--usage-location <code>',
    '[OPTIONAL] Two-letter country code for the agentic user\u2019s usage location (e.g. US). Falls back to `teams config` default-usage-location when omitted.'
  )
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintIdArg: string | undefined, options: AgentUserCreateOptions) => {
      await runAgentUserCreate(blueprintIdArg, options, options.blueprintName);
    })
  );
