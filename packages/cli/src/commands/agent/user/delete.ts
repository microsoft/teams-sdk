import type { AccountInfo } from '@azure/msal-node';
import { Command } from 'commander';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { getGeneratedConfigPath, readGeneratedConfig, updateGeneratedConfig } from '../../../apps/agent-config.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { confirmAction } from '../../../utils/interactive.js';
import { outputJson } from '../../../utils/json-output.js';
import { logger } from '../../../utils/logger.js';
import { requireAgentAccount } from '../shared.js';
import { runDeleteAgentIdentityAndUser } from './actions.js';

export interface AgentUserDeleteOptions {
  json?: boolean;
  dryRun?: boolean;
  cwd?: string;
}

export interface AgentUserDeleteOutput {
  agentIdentityId: string;
  agenticUserId: string;
  dryRun: boolean;
}

/**
 * Resolves the agentic user to delete (by object ID or UPN): an argument
 * passed directly on the command line always wins (looked up live via
 * Graph, so it works from any folder); otherwise falls back to the local
 * `agent.generated.config.json` written by `teams agent user create`.
 */
function resolveDeleteTarget(userIdOrUpnArg: string | undefined, cwd: string): string {
  if (userIdOrUpnArg) return userIdOrUpnArg;

  if (!existsSync(getGeneratedConfigPath(cwd))) {
    throw new CliError(
      'AGENT_IDENTITY_USER_NOT_FOUND',
      'No agent.generated.config.json found in this folder.',
      'Pass the agentic user\u2019s object ID or UPN directly, e.g. `teams agent user delete <userIdOrUpn>`.'
    );
  }

  const config = readGeneratedConfig(cwd);
  const target = config.userPrincipalName ?? config.agenticUserId;
  if (!target) {
    throw new CliError(
      'AGENT_IDENTITY_USER_NOT_FOUND',
      'agent.generated.config.json has no agentic user recorded.',
      'Pass the agentic user\u2019s object ID or UPN directly, e.g. `teams agent user delete <userIdOrUpn>`.'
    );
  }
  return target;
}

/**
 * Removes just an agentic user and its parent agent identity (created via
 * `teams agent user create`), leaving the blueprint itself intact so it
 * can keep being reused. Use `teams agent blueprint delete` instead to
 * remove everything, including the blueprint.
 */
export async function runAgentUserDelete(
  userIdOrUpnArg: string | undefined,
  options: AgentUserDeleteOptions,
  account: AccountInfo,
  cwd: string = process.cwd()
): Promise<AgentUserDeleteOutput> {
  const silent = !!options.json;
  const userIdOrUpn = resolveDeleteTarget(userIdOrUpnArg, cwd);

  if (options.dryRun) {
    if (!silent) {
      logger.info(pc.dim(`Would delete the agentic user ${userIdOrUpn} and its agent identity.`));
    }
    return { agentIdentityId: '', agenticUserId: userIdOrUpn, dryRun: true };
  }

  const result = await runDeleteAgentIdentityAndUser(userIdOrUpn, account, silent);

  const configPath = getGeneratedConfigPath(cwd);
  if (existsSync(configPath)) {
    const config = readGeneratedConfig(cwd);
    if (config.agenticUserId === result.agenticUserId || config.userPrincipalName === userIdOrUpn) {
      updateGeneratedConfig(cwd, {
        agentIdentityId: undefined,
        agenticUserId: undefined,
        agenticUserName: undefined,
        userPrincipalName: undefined,
      });
    }
  }

  return { agentIdentityId: result.agentIdentityId, agenticUserId: result.agenticUserId, dryRun: false };
}

export function renderAgentUserDeleteResult(output: AgentUserDeleteOutput): void {
  if (output.dryRun) {
    logger.info(pc.dim('\nNo changes were made (dry run).'));
    return;
  }

  logger.info('');
  logger.info(pc.green(`Agentic user ${output.agenticUserId} and its agent identity were removed.`));
  logger.info(pc.dim('The agent blueprint itself was not deleted -- run `teams agent blueprint delete` for that.'));
}

export const agentUserDeleteCommand = new Command('delete')
  .description('Delete an Agent 365 agentic user and its agent identity, keeping the blueprint')
  .argument(
    '[userIdOrUpn]',
    '[OPTIONAL] Agentic user\u2019s object ID or UPN to delete. Overrides agent.generated.config.json when given; required if no local config exists.'
  )
  .option('--json', '[OPTIONAL] Output as JSON')
  .option('--dry-run', '[OPTIONAL] Show what would be deleted without making any changes')
  .action(
    wrapAction(async (userIdOrUpnArg: string | undefined, options: AgentUserDeleteOptions) => {
      const account = await requireAgentAccount();

      if (!options.dryRun) {
        const proceed = await confirmAction(
          'This permanently deletes the agentic user and its agent identity. Continue?',
          !!options.json
        );
        if (!proceed) return;
      }

      const output = await runAgentUserDelete(userIdOrUpnArg, options, account, process.cwd());

      if (options.json) {
        outputJson(output);
        return;
      }
      renderAgentUserDeleteResult(output);
    })
  );
