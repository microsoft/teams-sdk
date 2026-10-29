import type { AccountInfo } from '@azure/msal-node';
import { input } from '@inquirer/prompts';
import { Command } from 'commander';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { getGeneratedConfigPath, readGeneratedConfig, updateGeneratedConfig } from '../../../apps/agent-config.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { isInteractive } from '../../../utils/interactive.js';
import { outputJson } from '../../../utils/json-output.js';
import { logger } from '../../../utils/logger.js';
import { requireAgentAccount } from '../shared.js';
import { assertHttpsEndpoint, registerAgentBlueprintEndpoint, runRenameAgentBlueprint } from './actions.js';

export interface AgentBlueprintUpdateOptions {
  json?: boolean;
  endpoint?: string;
  name?: string;
  /** [OPTIONAL] Working directory holding `agent.generated.config.json`. Defaults to process.cwd(). */
  cwd?: string;
  /** Tenant ID of the signed-in account, used to call the Agent 365 service. */
  tenantId: string;
}

export interface AgentBlueprintUpdateOutput {
  agentBlueprintId: string;
  messagingEndpoint?: string;
  name?: string;
  generatedConfigPath?: string;
}

export function renderAgentBlueprintUpdateResult(output: AgentBlueprintUpdateOutput): void {
  logger.info('');
  logger.info(`${pc.dim('Agent blueprint ID:')} ${output.agentBlueprintId}`);
  if (output.name) {
    logger.info(`${pc.dim('Name:')} ${output.name}`);
  }
  if (output.messagingEndpoint) {
    logger.info(`${pc.dim('Messaging endpoint:')} ${output.messagingEndpoint}`);
  }
}

/**
 * Resolves which blueprint to update: a `blueprintId` passed directly on
 * the command line always wins over the local config; otherwise this
 * runs without any local config involvement (nothing written back).
 */
function resolveUpdateTarget(
  blueprintIdArg: string | undefined,
  cwd: string,
  silent: boolean
): { agentBlueprintId: string; syncsLocalConfig: boolean } {
  const hasLocalConfig = existsSync(getGeneratedConfigPath(cwd));

  if (blueprintIdArg) {
    if (hasLocalConfig) {
      const config = readGeneratedConfig(cwd);
      if (config.agentBlueprintId === blueprintIdArg) {
        return { agentBlueprintId: blueprintIdArg, syncsLocalConfig: true };
      }
    }
    return { agentBlueprintId: blueprintIdArg, syncsLocalConfig: false };
  }

  if (!hasLocalConfig) {
    throw new CliError(
      'AGENT_BLUEPRINT_ID_REQUIRED',
      'No agent.generated.config.json found in this folder.',
      'Pass the agent blueprint ID directly, e.g. `teams agent blueprint update <blueprintId> --endpoint <url>`.'
    );
  }

  const config = readGeneratedConfig(cwd);
  if (!silent) {
    logger.info(pc.dim(`Using agent blueprint ${config.agentBlueprintId} from agent.generated.config.json.`));
  }
  return { agentBlueprintId: config.agentBlueprintId, syncsLocalConfig: true };
}

/**
 * Updates an existing agent blueprint: its display name, its messaging
 * endpoint, or both.
 */
export async function runAgentBlueprintUpdate(
  blueprintIdArg: string | undefined,
  options: AgentBlueprintUpdateOptions,
  account: AccountInfo
): Promise<AgentBlueprintUpdateOutput> {
  const silent = !!options.json;
  const cwd = options.cwd ?? process.cwd();

  const name = options.name?.trim();
  const endpoint = options.endpoint?.trim();
  if (!name && !endpoint) {
    throw new CliError(
      'AGENT_ENDPOINT_REQUIRED',
      'Nothing to update.',
      'Pass `--name <name>` and/or `--endpoint <url>`.'
    );
  }
  if (endpoint) {
    assertHttpsEndpoint(endpoint);
  }

  const target = resolveUpdateTarget(blueprintIdArg, cwd, silent);

  if (name) {
    await runRenameAgentBlueprint(target.agentBlueprintId, account, name, silent);
  }

  if (endpoint) {
    await registerAgentBlueprintEndpoint(target.agentBlueprintId, account.tenantId, endpoint, silent);
    if (target.syncsLocalConfig) {
      updateGeneratedConfig(cwd, { messagingEndpoint: endpoint });
    }
  }

  const output: AgentBlueprintUpdateOutput = {
    agentBlueprintId: target.agentBlueprintId,
    ...(name ? { name } : {}),
    ...(endpoint ? { messagingEndpoint: endpoint } : {}),
    ...(target.syncsLocalConfig && endpoint ? { generatedConfigPath: getGeneratedConfigPath(cwd) } : {}),
  };

  if (options.json) {
    outputJson(output);
    return output;
  }

  renderAgentBlueprintUpdateResult(output);
  return output;
}

export const agentBlueprintUpdateCommand = new Command('update')
  .description('Update an Agent 365 agent blueprint (name and/or messaging endpoint)')
  .argument(
    '[blueprintId]',
    '[OPTIONAL] Agent blueprint ID to update. Overrides agent.generated.config.json when given; required if no local config exists.'
  )
  .option('--name <name>', '[OPTIONAL] New display name for the agent blueprint')
  .option('--endpoint <url>', '[OPTIONAL] HTTPS URL for the messaging endpoint')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintIdArg: string | undefined, options: AgentBlueprintUpdateOptions) => {
      const account = await requireAgentAccount();
      options.tenantId = account.tenantId;

      if (!options.name && !options.endpoint && isInteractive() && !options.json) {
        options.endpoint = await input({ message: 'Messaging endpoint (HTTPS URL):' });
      }

      await runAgentBlueprintUpdate(blueprintIdArg, options, account);
    })
  );
