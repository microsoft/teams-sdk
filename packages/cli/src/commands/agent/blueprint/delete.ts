import type { AccountInfo } from '@azure/msal-node';
import { Command } from 'commander';
import { existsSync, rmSync } from 'node:fs';
import pc from 'picocolors';
import { getGeneratedConfigPath, readGeneratedConfig } from '../../../apps/agent-config.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { confirmAction } from '../../../utils/interactive.js';
import { outputJson } from '../../../utils/json-output.js';
import { logger } from '../../../utils/logger.js';
import { requireAgentAccount } from '../shared.js';
import { resolveBlueprintCleanupTarget, runDeleteAgentBlueprint, type AgentBlueprintCleanupTarget } from './actions.js';

export interface AgentBlueprintDeleteOptions {
  json?: boolean;
  dryRun?: boolean;
  cwd?: string;
}

export interface AgentBlueprintDeleteOutput {
  agentBlueprintId: string;
  dryRun: boolean;
}

/**
 * Resolves which blueprint to delete: a `blueprintId` passed directly on
 * the command line always wins (looked up live via Graph, so it works from
 * any folder); otherwise falls back to the local
 * `agent.generated.config.json`, same as before.
 */
async function resolveDeleteTarget(
  blueprintIdArg: string | undefined,
  cwd: string,
  account: AccountInfo,
  silent: boolean
): Promise<AgentBlueprintCleanupTarget> {
  if (blueprintIdArg) {
    return resolveBlueprintCleanupTarget(blueprintIdArg, account, silent);
  }

  if (!existsSync(getGeneratedConfigPath(cwd))) {
    throw new CliError(
      'AGENT_BLUEPRINT_ID_REQUIRED',
      'No agent.generated.config.json found in this folder.',
      'Pass the agent blueprint ID directly, e.g. `teams agent blueprint delete <blueprintId>`.'
    );
  }

  const config = readGeneratedConfig(cwd);
  if (!silent) {
    logger.info(pc.dim(`Using agent blueprint ${config.agentBlueprintId} from agent.generated.config.json.`));
  }
  return {
    agentBlueprintId: config.agentBlueprintId,
    agentBlueprintObjectId: config.agentBlueprintObjectId,
    agentBlueprintServicePrincipalObjectId: config.agentBlueprintServicePrincipalObjectId,
  };
}

/**
 * Removes ALL Agent 365 resources for an agent (blueprint application +
 * service principal, which cascades to its agent identities and agentic
 * users). Resolves the blueprint from a `blueprintId` argument if given,
 * otherwise from the folder `teams agent blueprint create` wrote
 * `agent.generated.config.json` into.
 */
export async function runAgentBlueprintDelete(
  blueprintIdArg: string | undefined,
  options: AgentBlueprintDeleteOptions,
  account: AccountInfo,
  cwd: string = process.cwd()
): Promise<AgentBlueprintDeleteOutput> {
  const silent = !!options.json;
  const target = await resolveDeleteTarget(blueprintIdArg, cwd, account, silent);

  if (!options.dryRun) {
    await runDeleteAgentBlueprint(target, account, silent);

    const configPath = getGeneratedConfigPath(cwd);
    if (!blueprintIdArg && existsSync(configPath)) rmSync(configPath);
  } else if (!silent) {
    logger.info(pc.dim(`Would delete agent blueprint ${target.agentBlueprintId} (${target.agentBlueprintObjectId})`));
    logger.info(
      pc.dim(
        `Would delete blueprint service principal ${target.agentBlueprintServicePrincipalObjectId}, cascading to its agent identities and agentic users.`
      )
    );
  }

  return {
    agentBlueprintId: target.agentBlueprintId,
    dryRun: !!options.dryRun,
  };
}

export function renderAgentBlueprintDeleteResult(output: AgentBlueprintDeleteOutput): void {
  if (output.dryRun) {
    logger.info(pc.dim('\nNo changes were made (dry run).'));
    return;
  }

  logger.info('');
  logger.info(pc.green(`Agent blueprint ${output.agentBlueprintId} and its resources were removed.`));
}

export const agentBlueprintDeleteCommand = new Command('delete')
  .description('Delete an Agent 365 agent blueprint and its resources')
  .argument(
    '[blueprintId]',
    '[OPTIONAL] Agent blueprint ID to delete. Overrides agent.generated.config.json when given; required if no local config exists.'
  )
  .option('--json', '[OPTIONAL] Output as JSON')
  .option('--dry-run', '[OPTIONAL] Show resources that would be deleted without making any changes')
  .action(
    wrapAction(async (blueprintIdArg: string | undefined, options: AgentBlueprintDeleteOptions) => {
      const account = await requireAgentAccount();

      if (!options.dryRun) {
        const proceed = await confirmAction(
          'This permanently deletes the agent blueprint, its agent identities, and agentic users. Continue?',
          !!options.json
        );
        if (!proceed) return;
      }

      const output = await runAgentBlueprintDelete(blueprintIdArg, options, account, process.cwd());

      if (options.json) {
        outputJson(output);
        return;
      }
      renderAgentBlueprintDeleteResult(output);
    })
  );
