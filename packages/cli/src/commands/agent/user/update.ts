import type { AccountInfo } from '@azure/msal-node';
import { input, select } from '@inquirer/prompts';
import { Command } from 'commander';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { getGeneratedConfigPath, readGeneratedConfig, updateAgentUser } from '../../../apps/agent-config.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { isInteractive } from '../../../utils/interactive.js';
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
  upn?: string;
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
  if (output.userPrincipalName) {
    logger.info(`${pc.dim('User principal name:')} ${output.userPrincipalName}`);
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

  if (!options.name && !options.usageLocation && options.license === undefined && !options.upn) {
    throw new CliError(
      'AGENT_IDENTITY_USER_FAILED',
      'Nothing to update.',
      'Pass `--name`, `--usage-location`, `--license <skuId>`, `--no-license`, and/or `--upn`.'
    );
  }

  const userIdOrUpn = resolveUpdateTarget(userIdOrUpnArg, cwd, silent);
  const result = await runUpdateAgenticUser(
    userIdOrUpn,
    account,
    silent,
    options.name,
    options.usageLocation,
    options.license,
    options.upn
  );

  const configPath = getGeneratedConfigPath(cwd);
  if (existsSync(configPath) && (result.name || result.userPrincipalName)) {
    const config = readGeneratedConfig(cwd);
    const match = (config.agentUsers ?? []).find(
      (user) => user.agenticUserId === result.agenticUserId || user.userPrincipalName === userIdOrUpn
    );
    if (match) {
      updateAgentUser(cwd, match.agenticUserId, {
        ...(result.name ? { agenticUserName: result.name } : {}),
        ...(result.userPrincipalName ? { userPrincipalName: result.userPrincipalName } : {}),
      });
    }
  }

  if (options.json) {
    outputJson(result);
    return result;
  }

  renderAgentUserUpdateResult(result);
  return result;
}

/**
 * Interactive menu shown when `teams agent user update` is run with no
 * mutation flags in a TTY: lets the user pick Name/Usage location/
 * License/UPN/Back and loops after each change, mirroring `teams app
 * update`'s menu instead of a single blind prompt + "Nothing to update"
 * error. Once a change is applied, subsequent loop iterations address the
 * agentic user by its stable object ID -- changing the UPN invalidates
 * any earlier UPN-based lookup.
 */
async function showAgentUserUpdateMenu(
  userIdOrUpnArg: string | undefined,
  options: AgentUserUpdateOptions,
  account: AccountInfo,
  cwd: string
): Promise<void> {
  let currentUserIdOrUpn = resolveUpdateTarget(userIdOrUpnArg, cwd, true);
  let currentLabel = currentUserIdOrUpn;

  while (true) {
    logger.info(`\n${pc.bold(currentLabel)}`);

    const action = await select({
      message: 'What would you like to update?',
      choices: [
        { name: 'Name', value: 'name' as const },
        { name: 'Usage location', value: 'usage-location' as const },
        { name: 'License', value: 'license' as const },
        { name: 'User principal name', value: 'upn' as const },
        { name: 'Back', value: 'back' as const },
      ],
    });
    if (action === 'back') return;

    let result: AgentUserUpdateResult | undefined;

    if (action === 'name') {
      const name = (await input({ message: 'New display name:' })).trim();
      if (name) {
        result = await runAgentUserUpdate(currentUserIdOrUpn, { ...options, name }, account, cwd);
      }
    } else if (action === 'usage-location') {
      const usageLocation = (await input({ message: 'Usage location (two-letter country code):' })).trim();
      if (usageLocation) {
        result = await runAgentUserUpdate(currentUserIdOrUpn, { ...options, usageLocation }, account, cwd);
      }
    } else if (action === 'license') {
      const choice = await select({
        message: 'License:',
        choices: [
          { name: 'Assign a specific SKU', value: 'assign' as const },
          { name: 'Remove all licenses', value: 'remove' as const },
        ],
      });
      if (choice === 'remove') {
        result = await runAgentUserUpdate(currentUserIdOrUpn, { ...options, license: false }, account, cwd);
      } else {
        const skuId = (await input({ message: 'License SKU ID or part number:' })).trim();
        if (skuId) {
          result = await runAgentUserUpdate(currentUserIdOrUpn, { ...options, license: skuId }, account, cwd);
        }
      }
    } else {
      const upn = (await input({ message: 'New user principal name (e.g. name@tenant.onmicrosoft.com):' })).trim();
      if (upn) {
        result = await runAgentUserUpdate(currentUserIdOrUpn, { ...options, upn }, account, cwd);
      }
    }

    if (result) {
      currentUserIdOrUpn = result.agenticUserId;
      currentLabel = result.userPrincipalName ?? result.name ?? currentLabel;
    }
  }
}

export const agentUserUpdateCommand = new Command('update')
  .description("Update an Agent 365 agentic user's name, usage location, license, and/or UPN")
  .argument(
    '[userIdOrUpn]',
    '[OPTIONAL] Agentic user\u2019s object ID or UPN to update. Overrides agent.generated.config.json when given; required if no local config exists.'
  )
  .option('--name <name>', '[OPTIONAL] New display name for the agentic user')
  .option('--usage-location <code>', '[OPTIONAL] Two-letter country code for the agentic user\u2019s usage location (e.g. US)')
  .option('--license <skuId>', '[OPTIONAL] License SKU ID or part number to assign')
  .option('--no-license', '[OPTIONAL] Remove all currently assigned licenses')
  .option('--upn <value>', '[OPTIONAL] New user principal name for the agentic user (must use a verified domain in the tenant)')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (userIdOrUpnArg: string | undefined, options: AgentUserUpdateOptions) => {
      const account = await requireAgentAccount(!!options.json);

      const hasMutationFlags =
        !!options.name || !!options.usageLocation || options.license !== undefined || !!options.upn;
      if (!hasMutationFlags && !options.json && isInteractive()) {
        await showAgentUserUpdateMenu(userIdOrUpnArg, options, account, process.cwd());
        return;
      }

      await runAgentUserUpdate(userIdOrUpnArg, options, account, process.cwd());
    })
  );
