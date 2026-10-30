import { input } from '@inquirer/prompts';
import { Command } from 'commander';
import { join } from 'node:path';
import pc from 'picocolors';
import {
  AGENT_GITIGNORE_ENTRIES,
  ensureGitignoreEntries,
  getGeneratedConfigPath,
  updateGeneratedConfig,
  writeGeneratedConfig,
  type AgentGeneratedConfig,
} from '../../../apps/agent-config.js';
import { writeCredentials } from '../../../utils/env.js';
import { wrapAction } from '../../../utils/errors.js';
import { isInteractive } from '../../../utils/interactive.js';
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
}

export interface AgentBlueprintCreateOutput {
  agentBlueprintId: string;
  agentBlueprintObjectId: string;
  managedIdentityPrincipalId: string;
  messagingEndpoint?: string;
  generatedConfigPath: string;
  /** .env path where CLIENT_ID/CLIENT_SECRET/TENANT_ID were written for the Teams SDK app. */
  envPath: string;
  /** Microsoft Graph delegated scopes granted and made inheritable, if any were requested via --permissions. */
  graphPermissions?: string[];
}

/**
 * Resolves the messaging endpoint to register right after blueprint
 * creation. Both follow-up paths (Teams app and agentic user) need it
 * registered on the blueprint's own bot identity for the deployed agent to
 * actually receive messages, so this runs before the "how will this agent
 * run?" fork. `--endpoint` lets non-interactive/CI callers set it directly;
 * otherwise it's optional -- you may not have anything deployed yet -- so
 * pressing enter (or running non-interactively/`--json`) skips it.
 */
async function resolveOptionalEndpoint(endpointFlag: string | undefined, silent: boolean): Promise<string | undefined> {
  if (endpointFlag?.trim()) return endpointFlag.trim();
  if (silent || !isInteractive()) return undefined;

  const endpoint = await input({
    message: 'Messaging endpoint (HTTPS URL, press enter to skip and set it later):',
  });
  return endpoint.trim() || undefined;
}

export function toAgentBlueprintCreateOutput(
  config: AgentGeneratedConfig,
  generatedConfigPath: string,
  envPath: string
): AgentBlueprintCreateOutput {
  return {
    agentBlueprintId: config.agentBlueprintId,
    agentBlueprintObjectId: config.agentBlueprintObjectId,
    managedIdentityPrincipalId: config.agentBlueprintServicePrincipalObjectId,
    ...(config.messagingEndpoint ? { messagingEndpoint: config.messagingEndpoint } : {}),
    generatedConfigPath,
    envPath,
    ...(config.graphPermissions?.length ? { graphPermissions: config.graphPermissions } : {}),
  };
}

function renderAgentBlueprintCreateResult(output: AgentBlueprintCreateOutput): void {
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
  if (output.graphPermissions?.length) {
    logger.info(`${pc.dim('Inheritable Microsoft Graph permissions:')} ${output.graphPermissions.join(', ')}`);
  }
  logger.info('');
  logger.info(
    `${pc.dim('Tip:')} to also create an Agent 365 identity and agentic user for this blueprint, run ${pc.cyan(
      `teams agent user create ${output.agentBlueprintId}`
    )}.`
  );
}

export async function runAgentBlueprintCreate(
  nameArg: string | undefined,
  options: AgentBlueprintCreateOptions
): Promise<AgentBlueprintCreateOutput> {
  const silent = !!options.json;

  if (options.endpoint?.trim()) {
    assertHttpsEndpoint(options.endpoint.trim());
  }

  const name = await resolveAgentName(nameArg, silent);
  const account = await requireAgentAccount(silent);

  const cwd = options.cwd ?? process.cwd();
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
  writeGeneratedConfig(cwd, config);

  const envPath = join(cwd, '.env');
  writeCredentials(envPath, {
    CLIENT_ID: blueprint.agentBlueprintId,
    CLIENT_SECRET: blueprint.agentBlueprintClientSecret,
    TENANT_ID: account.tenantId,
  });
  ensureGitignoreEntries(cwd, ['.env', ...AGENT_GITIGNORE_ENTRIES]);

  const endpoint = await resolveOptionalEndpoint(options.endpoint, silent);
  if (endpoint) {
    assertHttpsEndpoint(endpoint);
    await registerAgentBlueprintEndpoint(config.agentBlueprintId, account.tenantId, endpoint, silent);
    updateGeneratedConfig(cwd, { messagingEndpoint: endpoint });
    config.messagingEndpoint = endpoint;
  }

  const output = toAgentBlueprintCreateOutput(config, getGeneratedConfigPath(cwd), envPath);

  if (options.json) {
    outputJson(output);
    return output;
  }

  renderAgentBlueprintCreateResult(output);

  return output;
}

export const agentBlueprintCreateCommand = new Command('create')
  .description('Create an Agent 365 agent blueprint')
  .argument('[name]', 'Agent name')
  .option('--endpoint <url>', '[OPTIONAL] HTTPS messaging endpoint to register right away')
  .option(
    '--permissions <scopes>',
    '[OPTIONAL] Comma-separated Microsoft Graph delegated scopes (e.g. Mail.ReadWrite,Chat.ReadWrite) to grant and make inheritable by every agent identity created from this blueprint. Falls back to `teams config` default-permissions when omitted.'
  )
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (nameArg: string | undefined, options: AgentBlueprintCreateOptions) => {
      await runAgentBlueprintCreate(nameArg, options);
    })
  );
