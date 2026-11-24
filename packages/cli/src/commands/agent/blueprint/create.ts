import { input } from '@inquirer/prompts';
import { Command } from 'commander';
import { accessSync, constants, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pc from 'picocolors';
import {
  AGENT_GITIGNORE_ENTRIES,
  ensureCredentialFileIgnored,
  ensureGitignoreEntries,
  getGeneratedConfigPath,
  updateGeneratedConfig,
  writeGeneratedConfig,
  type AgentGeneratedConfig,
} from '../../../apps/agent-config.js';
import { detectCsharpProjectDir, resolveCredentialDestination } from '../../../utils/credential-destination.js';
import { isAppSettingsFile, writeAzureAdCredentials, writeCredentials } from '../../../utils/env.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { confirmAction, isInteractive } from '../../../utils/interactive.js';
import { outputJson } from '../../../utils/json-output.js';
import { logger } from '../../../utils/logger.js';
import { requireAgentAccount, resolveAgentName, resolveGraphPermissionsDefault } from '../shared.js';
import { assertHttpsEndpoint, registerAgentBlueprintEndpoint, runCreateAgentBlueprint } from './actions.js';

export interface AgentBlueprintCreateOptions {
  json?: boolean;
  /** [OPTIONAL] HTTPS messaging endpoint to register on the blueprint right away. Prompted for interactively when omitted. */
  endpoint?: string;
  /** [OPTIONAL] Comma-separated Microsoft Graph delegated scopes (e.g. Mail.ReadWrite,Chat.ReadWrite) to grant and make inheritable by every agent identity created from this blueprint. */
  permissions?: string;
  /** [OPTIONAL] Working directory for the generated config file. Defaults to process.cwd(). */
  cwd?: string;
  /** [OPTIONAL] Additional credentials file to write alongside the root `.env` (e.g. a C# project's `appsettings.json`). */
  env?: string;
}

export interface AgentBlueprintCreateOutput {
  agentBlueprintId: string;
  agentBlueprintObjectId: string;
  managedIdentityPrincipalId: string;
  messagingEndpoint?: string;
  generatedConfigPath: string;
  /** .env path where CLIENT_ID/CLIENT_SECRET/TENANT_ID were written for the Teams SDK app. */
  envPath: string;
  /** Additional language-specific file the credentials were also written to (e.g. a C# project's `appsettings.json`), when different from `.env`. */
  credentialsFile?: string;
  /** Microsoft Graph delegated scopes granted and made inheritable, if any were requested via --permissions. */
  graphPermissions?: string[];
}

async function resolveOptionalEndpoint(endpointFlag: string | undefined, silent: boolean): Promise<string | undefined> {
  if (endpointFlag?.trim()) return endpointFlag.trim();
  if (silent || !isInteractive()) return undefined;

  const endpoint = await input({
    message: 'Messaging endpoint (HTTPS URL, press enter to skip and set it later):',
  });
  return endpoint.trim() || undefined;
}

/**
 * Cheap pre-flight check, run before any Graph writes: if `cwd` isn't
 * writable, bail out immediately instead of creating a blueprint we won't
 * be able to record locally. Catches the common permission-denied/read-only
 * filesystem cases; it can't guarantee the later writes will succeed (e.g.
 * disk full), but it removes the most likely failure modes.
 */
function assertCwdWritable(cwd: string): void {
  try {
    accessSync(cwd, constants.W_OK);
  } catch {
    throw new CliError(
      'AGENT_CWD_NOT_WRITABLE',
      `${cwd} is not writable.`,
      'Run this command from a folder you have write access to, then retry.'
    );
  }
}

/** Warns and confirms before overwriting an existing agent.generated.config.json in `cwd`. */
async function assertNoExistingConfig(cwd: string, silent: boolean): Promise<void> {
  const path = getGeneratedConfigPath(cwd);
  if (!existsSync(path)) return;

  if (!silent) {
    logger.info(pc.yellow(`A blueprint is already recorded in ${path} and will be overwritten.`));
  }
  const proceed = await confirmAction('Overwrite it with a new blueprint?', silent);
  if (!proceed) {
    throw new CliError(
      'AGENT_CONFIG_EXISTS',
      `${path} already exists.`,
      'Run this command from a different folder to keep the existing blueprint config.'
    );
  }
}

export function toAgentBlueprintCreateOutput(
  config: AgentGeneratedConfig,
  generatedConfigPath: string,
  envPath: string,
  credentialsFile?: string
): AgentBlueprintCreateOutput {
  return {
    agentBlueprintId: config.agentBlueprintId,
    agentBlueprintObjectId: config.agentBlueprintObjectId,
    managedIdentityPrincipalId: config.agentBlueprintServicePrincipalObjectId,
    ...(config.messagingEndpoint ? { messagingEndpoint: config.messagingEndpoint } : {}),
    generatedConfigPath,
    envPath,
    ...(credentialsFile ? { credentialsFile } : {}),
    ...(config.graphPermissions?.length ? { graphPermissions: config.graphPermissions } : {}),
  };
}

/**
 * `teams agent user create` writes credentials to `.env` by default, which
 * a C# project never reads (it loads `appsettings.json` instead). When `cwd`
 * looks like a C# project, point the tip at it with `--env` so the
 * credentials actually land somewhere the project picks up.
 */
function agentUserCreateHintFor(agentBlueprintId: string, cwd: string): string {
  const csharpProjectDir = detectCsharpProjectDir(cwd);
  if (!csharpProjectDir) return `teams agent user create ${agentBlueprintId}`;

  const appSettingsPath = join(csharpProjectDir, 'appsettings.json');
  return `teams agent user create ${agentBlueprintId} --env ${appSettingsPath}`;
}

function renderAgentBlueprintCreateResult(output: AgentBlueprintCreateOutput, cwd: string): void {
  logger.info('');
  logger.info(`${pc.dim('Agent blueprint ID:')} ${output.agentBlueprintId}`);
  logger.info(`${pc.dim('Managed identity principal ID:')} ${output.managedIdentityPrincipalId}`);
  if (output.messagingEndpoint) {
    logger.info(`${pc.dim('Messaging endpoint:')} ${output.messagingEndpoint}`);
  } else {
    logger.info(
      `${pc.dim('Messaging endpoint:')} not set yet — run ${pc.cyan('teams agent blueprint update --endpoint <url>')} once your agent is deployed.`
    );
  }
  logger.info(`${pc.dim('Generated config:')} ${output.generatedConfigPath}`);
  logger.info(`${pc.dim('Teams SDK credentials:')} ${output.envPath} ${pc.dim('(CLIENT_ID/CLIENT_SECRET/TENANT_ID)')}`);
  if (output.credentialsFile) {
    logger.info(`${pc.dim('Credentials file:')} ${output.credentialsFile}`);
  }
  if (output.graphPermissions?.length) {
    logger.info(`${pc.dim('Inheritable Microsoft Graph permissions:')} ${output.graphPermissions.join(', ')}`);
  }
  logger.info('');
  logger.info(
    `${pc.dim('Tip:')} to also create an Agent 365 identity and agentic user for this blueprint, run ${pc.cyan(
      agentUserCreateHintFor(output.agentBlueprintId, cwd)
    )}.`
  );
}

export async function runAgentBlueprintCreate(
  nameArg: string | undefined,
  options: AgentBlueprintCreateOptions
): Promise<AgentBlueprintCreateOutput> {
  const silent = !!options.json;
  const cwd = options.cwd ?? process.cwd();
  await assertNoExistingConfig(cwd, silent);
  assertCwdWritable(cwd);

  if (options.endpoint?.trim()) {
    assertHttpsEndpoint(options.endpoint.trim());
  }

  const credentialPath = await resolveCredentialDestination({
    explicit: options.env,
    interactive: !silent && isInteractive(),
    json: options.json,
    cwd,
  });

  const name = await resolveAgentName(nameArg, silent);
  const account = await requireAgentAccount(silent);

  const graphScopes = await resolveGraphPermissionsDefault(options.permissions, silent);
  const blueprint = await runCreateAgentBlueprint(name, account, silent, graphScopes);

  const config: AgentGeneratedConfig = {
    agentBlueprintName: name,
    agentBlueprintId: blueprint.agentBlueprintId,
    agentBlueprintObjectId: blueprint.agentBlueprintObjectId,
    agentBlueprintServicePrincipalObjectId: blueprint.agentBlueprintServicePrincipalObjectId,
    ...(blueprint.graphPermissions?.length ? { graphPermissions: blueprint.graphPermissions } : {}),
    completedAt: new Date().toISOString(),
  };

  const envPath = join(cwd, '.env');
  const credentials = {
    CLIENT_ID: blueprint.agentBlueprintId,
    CLIENT_SECRET: blueprint.agentBlueprintClientSecret,
    TENANT_ID: account.tenantId,
  };
  const extraCredentialPath =
    credentialPath && resolve(credentialPath) !== resolve(envPath) ? credentialPath : undefined;
  try {
    writeGeneratedConfig(cwd, config);
    writeCredentials(envPath, credentials);
    if (extraCredentialPath) {
      // C# appsettings files need the AzureAd shape (see csharp.ts's mapBaseEnvVars), not the
      // generic Teams shape writeCredentials() uses for other JSON files.
      if (isAppSettingsFile(extraCredentialPath)) {
        writeAzureAdCredentials(extraCredentialPath, credentials);
      } else {
        writeCredentials(extraCredentialPath, credentials);
      }
    }
    ensureGitignoreEntries(cwd, ['.env', ...AGENT_GITIGNORE_ENTRIES]);
    if (extraCredentialPath) {
      ensureCredentialFileIgnored(cwd, extraCredentialPath);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new CliError(
      'AGENT_CONFIG_WRITE_FAILED',
      `Agent blueprint ${blueprint.agentBlueprintId} (object ID ${blueprint.agentBlueprintObjectId}) was created in Microsoft Graph, but writing the local config/credentials in ${cwd} failed: ${reason}`,
      `The blueprint already exists -- don't retry this command, or you'll create a duplicate. Fix the local write issue, then manually record agentBlueprintId ${blueprint.agentBlueprintId} and agentBlueprintObjectId ${blueprint.agentBlueprintObjectId} in ${getGeneratedConfigPath(cwd)}, or delete the blueprint with \`teams agent blueprint delete ${blueprint.agentBlueprintId}\` and retry from scratch.`
    );
  }

  const endpoint = await resolveOptionalEndpoint(options.endpoint, silent);
  if (endpoint) {
    assertHttpsEndpoint(endpoint);
    await registerAgentBlueprintEndpoint(config.agentBlueprintId, endpoint, silent);
    updateGeneratedConfig(cwd, { messagingEndpoint: endpoint });
    config.messagingEndpoint = endpoint;
  }

  const output = toAgentBlueprintCreateOutput(config, getGeneratedConfigPath(cwd), envPath, extraCredentialPath);

  if (options.json) {
    outputJson(output);
    return output;
  }

  renderAgentBlueprintCreateResult(output, cwd);

  return output;
}

export const agentBlueprintCreateCommand = new Command('create')
  .description('Create an Agent 365 agent blueprint')
  .argument('[name]', 'Agent name')
  .option('--endpoint <url>', '[OPTIONAL] HTTPS messaging endpoint to register right away')
  .option(
    '--permissions <scopes>',
    '[OPTIONAL] Comma-separated Microsoft Graph delegated scopes (e.g. Mail.ReadWrite,Chat.ReadWrite) to grant and make inheritable by every agent identity created from this blueprint. Falls back to `teams config` agent-default-permissions when omitted.'
  )
  .option('--env <path>', '[OPTIONAL] Path to credentials file (.env or C# appsettings.json)')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (nameArg: string | undefined, options: AgentBlueprintCreateOptions) => {
      await runAgentBlueprintCreate(nameArg, options);
    })
  );
