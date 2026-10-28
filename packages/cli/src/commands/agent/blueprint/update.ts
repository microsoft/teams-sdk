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
import { assertHttpsEndpoint, registerAgentBlueprintEndpoint, syncTeamsAppEndpointDomain } from './actions.js';

export interface AgentBlueprintUpdateOptions {
  json?: boolean;
  endpoint?: string;
  /** [OPTIONAL] Working directory holding `agent.generated.config.json`. Defaults to process.cwd(). */
  cwd?: string;
  /** Tenant ID of the signed-in account, used to call the Agent 365 service. */
  tenantId: string;
}

export interface AgentBlueprintUpdateOutput {
  agentBlueprintId: string;
  messagingEndpoint: string;
  teamsAppId?: string;
  generatedConfigPath?: string;
}

export function renderAgentBlueprintUpdateResult(output: AgentBlueprintUpdateOutput): void {
  logger.info('');
  logger.info(`${pc.dim('Agent blueprint ID:')} ${output.agentBlueprintId}`);
  logger.info(`${pc.dim('Messaging endpoint:')} ${output.messagingEndpoint}`);
  if (output.teamsAppId) {
    logger.info(`${pc.dim('Teams app ID:')} ${output.teamsAppId}`);
  }
}

/**
 * Resolves which blueprint to update: a `blueprintId` passed directly on
 * the command line always wins over the local config. When it's also the
 * blueprint the local `agent.generated.config.json` (if any) was written
 * for, that config's `teamsAppId` is reused and the config stays in sync;
 * otherwise this runs without any local config involvement (no Teams app
 * domain sync, nothing written back).
 */
function resolveUpdateTarget(
  blueprintIdArg: string | undefined,
  cwd: string
): { agentBlueprintId: string; teamsAppId?: string; syncsLocalConfig: boolean } {
  const hasLocalConfig = existsSync(getGeneratedConfigPath(cwd));

  if (blueprintIdArg) {
    if (hasLocalConfig) {
      const config = readGeneratedConfig(cwd);
      if (config.agentBlueprintId === blueprintIdArg) {
        return { agentBlueprintId: blueprintIdArg, teamsAppId: config.teamsAppId, syncsLocalConfig: true };
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
  return { agentBlueprintId: config.agentBlueprintId, teamsAppId: config.teamsAppId, syncsLocalConfig: true };
}

/**
 * Registers/updates the messaging endpoint for an existing agent blueprint.
 * If a Teams app package already exists for it (created via `teams agent
 * blueprint create`'s "As a Teams app" path), its `validDomains` are kept
 * in sync with the new endpoint.
 */
export async function runAgentBlueprintUpdate(
  blueprintIdArg: string | undefined,
  options: AgentBlueprintUpdateOptions
): Promise<AgentBlueprintUpdateOutput> {
  const silent = !!options.json;
  const cwd = options.cwd ?? process.cwd();

  const endpoint = options.endpoint?.trim();
  if (!endpoint) {
    throw new CliError(
      'AGENT_ENDPOINT_REQUIRED',
      'A messaging endpoint is required.',
      'Pass it with `--endpoint <url>`.'
    );
  }
  assertHttpsEndpoint(endpoint);

  const target = resolveUpdateTarget(blueprintIdArg, cwd);
  await registerAgentBlueprintEndpoint(target.agentBlueprintId, options.tenantId, endpoint, silent);
  if (target.syncsLocalConfig) {
    updateGeneratedConfig(cwd, { messagingEndpoint: endpoint });
  }

  if (target.teamsAppId) {
    await syncTeamsAppEndpointDomain(target.teamsAppId, endpoint, silent);
  }

  const output: AgentBlueprintUpdateOutput = {
    agentBlueprintId: target.agentBlueprintId,
    messagingEndpoint: endpoint,
    ...(target.teamsAppId ? { teamsAppId: target.teamsAppId } : {}),
    ...(target.syncsLocalConfig ? { generatedConfigPath: getGeneratedConfigPath(cwd) } : {}),
  };

  if (options.json) {
    outputJson(output);
    return output;
  }

  renderAgentBlueprintUpdateResult(output);
  return output;
}

export const agentBlueprintUpdateCommand = new Command('update')
  .description('Update an Agent 365 agent blueprint (messaging endpoint)')
  .argument(
    '[blueprintId]',
    '[OPTIONAL] Agent blueprint ID to update. Overrides agent.generated.config.json when given; required if no local config exists.'
  )
  .option('--endpoint <url>', 'HTTPS URL for the messaging endpoint')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintIdArg: string | undefined, options: AgentBlueprintUpdateOptions) => {
      const account = await requireAgentAccount();
      options.tenantId = account.tenantId;

      if (!options.endpoint && isInteractive() && !options.json) {
        options.endpoint = await input({ message: 'Messaging endpoint (HTTPS URL):' });
      }

      await runAgentBlueprintUpdate(blueprintIdArg, options);
    })
  );
