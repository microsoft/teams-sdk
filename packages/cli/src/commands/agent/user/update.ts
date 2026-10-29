import type { AccountInfo } from '@azure/msal-node';
import { Command } from 'commander';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { getGeneratedConfigPath, readGeneratedConfig, updateAgentUser } from '../../../apps/agent-config.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { outputJson } from '../../../utils/json-output.js';
import { logger } from '../../../utils/logger.js';
import { requireAgentAccount } from '../shared.js';
import { runUpdateAgenticUser, type AgentUserUpdateResult } from './actions.js';

export interface AgentUserUpdateOptions {
  json?: boolean;
  name?: string;
  usageLocation?: string;
  /** `false` when `--no-license` was passed (Commander maps `--license <skuId>`/`--no-license` onto this one value). */
  license?: string | false;
  cwd?: string;
}

export type AgentUserUpdateOutput = AgentUserUpdateResult;

/**
 * Resolves the agentic user to update (by object ID or UPN): an argument
 * passed directly on the command line always wins (looked up live via
 * Graph, so it works from any folder); otherwise falls back to the local
 * `agent.generated.config.json` written by `teams agent user create`, but
 * only when it recorded exactly one agentic user -- with more than one,
 * the caller must say which.
 */
function resolveUpdateTarget(userIdOrUpnArg: string | undefined, cwd: string, silent: boolean): string {
  if (userIdOrUpnArg) return userIdOrUpnArg;

  if (!existsSync(getGeneratedConfigPath(cwd))) {
    throw new CliError(
      'AGENT_IDENTITY_USER_NOT_FOUND',
      'No agent.generated.config.json found in this folder.',
      'Pass the agentic user\u2019s object ID or UPN directly, e.g. `teams agent user update <userIdOrUpn> --name <name>`.'
    );
  }

  const config = readGeneratedConfig(cwd);
  const users = config.agentUsers ?? [];
  if (users.length === 0) {
    throw new CliError(
      'AGENT_IDENTITY_USER_NOT_FOUND',
      'agent.generated.config.json has no agentic user recorded.',
      'Pass the agentic user\u2019s object ID or UPN directly, e.g. `teams agent user update <userIdOrUpn> --name <name>`.'
    );
  }
  if (users.length > 1) {
    const options = users.map((user) => user.userPrincipalName ?? user.agenticUserId).join(', ');
    throw new CliError(
      'AGENT_IDENTITY_USER_AMBIGUOUS',
      `agent.generated.config.json has ${users.length} agentic users recorded: ${options}.`,
      'Pass the agentic user\u2019s object ID or UPN directly, e.g. `teams agent user update <userIdOrUpn> --name <name>`.'
    );
  }

  const target = users[0].userPrincipalName ?? users[0].agenticUserId;
  if (!silent) {
    logger.info(pc.dim(`Using agentic user ${target} from agent.generated.config.json.`));
  }
  return target;
}

export function renderAgentUserUpdateResult(output: AgentUserUpdateOutput): void {
  logger.info('');
  logger.info(`${pc.dim('Agentic user object ID:')} ${output.agenticUserId}`);
  if (output.name) {
    logger.info(`${pc.dim('Name:')} ${output.name}`);
  }
  if (output.usageLocation) {
    logger.info(`${pc.dim('Usage location:')} ${output.usageLocation}`);
  }
  if (output.licenseAssigned) {
    logger.info(pc.dim(`License ${output.licenseSkuPartNumber ?? ''} assigned.`.trim()));
  }
  if (output.licenseRemoved) {
    logger.info(pc.dim('License(s) removed.'));
  }
}

/**
 * Updates an existing Agent 365 agentic user's display name, usage
 * location, and/or license -- the properties of the user object that can
 * change after creation without recreating it.
 */
export async function runAgentUserUpdate(
  userIdOrUpnArg: string | undefined,
  options: AgentUserUpdateOptions,
  account: AccountInfo,
  cwd: string = process.cwd()
): Promise<AgentUserUpdateOutput> {
  const silent = !!options.json;

  if (!options.name && !options.usageLocation && options.license === undefined) {
    throw new CliError(
      'AGENT_IDENTITY_USER_FAILED',
      'Nothing to update.',
      'Pass `--name`, `--usage-location`, `--license <skuId>`, and/or `--no-license`.'
    );
  }

  const userIdOrUpn = resolveUpdateTarget(userIdOrUpnArg, cwd, silent);
  const result = await runUpdateAgenticUser(userIdOrUpn, account, silent, options.name, options.usageLocation, options.license);

  const configPath = getGeneratedConfigPath(cwd);
  if (existsSync(configPath) && result.name) {
    const config = readGeneratedConfig(cwd);
    const match = (config.agentUsers ?? []).find(
      (user) => user.agenticUserId === result.agenticUserId || user.userPrincipalName === userIdOrUpn
    );
    if (match) {
      updateAgentUser(cwd, match.agenticUserId, { agenticUserName: result.name });
    }
  }

  if (options.json) {
    outputJson(result);
    return result;
  }

  renderAgentUserUpdateResult(result);
  return result;
}

export const agentUserUpdateCommand = new Command('update')
  .description("Update an Agent 365 agentic user's name, usage location, and/or license")
  .argument(
    '[userIdOrUpn]',
    '[OPTIONAL] Agentic user\u2019s object ID or UPN to update. Overrides agent.generated.config.json when given; required if no local config exists.'
  )
  .option('--name <name>', '[OPTIONAL] New display name for the agentic user')
  .option('--usage-location <code>', '[OPTIONAL] Two-letter country code for the agentic user\u2019s usage location (e.g. US)')
  .option('--license <skuId>', '[OPTIONAL] License SKU ID or part number to assign')
  .option('--no-license', '[OPTIONAL] Remove all currently assigned licenses')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (userIdOrUpnArg: string | undefined, options: AgentUserUpdateOptions) => {
      const account = await requireAgentAccount();
      await runAgentUserUpdate(userIdOrUpnArg, options, account, process.cwd());
    })
  );
