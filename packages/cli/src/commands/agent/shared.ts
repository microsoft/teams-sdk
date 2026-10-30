import type { AccountInfo } from '@azure/msal-node';
import { input } from '@inquirer/prompts';
import pc from 'picocolors';
import { getAccount } from '../../auth/index.js';
import { getConfig } from '../../utils/config.js';
import { ensureAz } from '../../utils/az.js';
import { ensureTenantMatch } from '../../utils/az-prompts.js';
import { CliError } from '../../utils/errors.js';
import { isInteractive } from '../../utils/interactive.js';
import { logger } from '../../utils/logger.js';
import { createSilentSpinner } from '../../utils/spinner.js';

/**
 * Preflight shared by every `teams agent` subcommand: requires a logged-in
 * account, Azure CLI installed and logged in (every agent operation shells
 * out to `az account get-access-token` for an admin-delegated Graph token --
 * see `getAzAccessToken`), and verifies the Azure CLI's active tenant
 * matches the signed-in account's. Also warns that a Global Administrator
 * role is needed -- unlike the official `a365` CLI, these commands have no
 * Agent-ID-Developer deferred-consent fallback (see the `agent` docs'
 * Prerequisites section), so a non-admin account will fail partway through
 * rather than completing with a manual follow-up step. Returns the account
 * for commands that need it (e.g. tenantId).
 */
export async function requireAgentAccount(silent = false): Promise<AccountInfo> {
  const account = await getAccount();
  if (!account) {
    throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
  }
  await ensureAz();
  await ensureTenantMatch(account.tenantId);
  if (!silent) {
    logger.warn(
      pc.yellow('⚠'),
      'These commands require a Global Administrator role in the tenant -- a non-admin account will fail partway through.'
    );
  }
  return account;
}

/**
 * Resolves the display name for a brand-new agent blueprint: the `[name]`
 * argument if given, otherwise an interactive prompt. Shared by `teams
 * agent blueprint create` and `teams agent user create` (which creates a
 * blueprint on the fly when no blueprint ID is given).
 */
export async function resolveAgentName(
  nameArg: string | undefined,
  silent: boolean,
  /** [OPTIONAL] Pre-fill for the interactive prompt (e.g. the enclosing project's name), still editable by the user. */
  defaultName?: string
): Promise<string> {
  if (nameArg?.trim()) return nameArg.trim();

  if (!isInteractive() || silent) {
    if (defaultName?.trim()) return defaultName.trim();
    throw new CliError(
      'AGENT_NAME_REQUIRED',
      'An agent name is required in non-interactive mode.',
      'Pass it as an argument, e.g. `teams agent blueprint create <name>`.'
    );
  }

  const name = await input({ message: 'Blueprint name:', default: defaultName?.trim() });
  if (!name.trim()) {
    throw new CliError('AGENT_NAME_REQUIRED', 'Agent name cannot be empty.');
  }
  return name.trim();
}

export interface AgentSpinnerText {
  start: string;
  success: string;
  error: string;
}

/**
 * Runs `fn` under a spinner, flipping it to the error state before
 * rethrowing on failure. Shared across `teams agent` subcommands so each
 * one only supplies spinner copy and its own logic.
 */
export async function withAgentSpinner<T>(
  text: AgentSpinnerText,
  silent: boolean,
  fn: (spinner: ReturnType<typeof createSilentSpinner>) => Promise<T>
): Promise<T> {
  const spinner = createSilentSpinner(text.start, silent).start();
  try {
    const result = await fn(spinner);
    spinner.success({ text: text.success });
    return result;
  } catch (error) {
    spinner.error({ text: text.error });
    throw error;
  }
}

/**
 * Resolves the `--usage-location` value to use, falling back to the
 * `agent-default-usage-location` set via `teams config` when the
 * flag is omitted. Returns undefined (no default available) otherwise,
 * leaving further fallback (tenant-detected country/prompt) to the caller.
 */
export async function resolveUsageLocationDefault(
  usageLocationFlag: string | undefined,
  silent: boolean
): Promise<string | undefined> {
  if (usageLocationFlag?.trim()) return usageLocationFlag;

  const configDefault = await getConfig('agent-default-usage-location');
  if (configDefault && !silent) {
    logger.info(pc.dim(`Using default usage location ${configDefault} from teams config.`));
  }
  return configDefault;
}

/**
 * Resolves the `--license` value to use, falling back to the
 * `agent-default-license` set via `teams config` when the flag is
 * omitted. `--no-license` (`licenseFlag === false`) always wins as an
 * explicit opt-out and is never overridden by the default.
 */
export async function resolveLicenseDefault(
  licenseFlag: string | false | undefined,
  silent: boolean
): Promise<string | false | undefined> {
  if (licenseFlag !== undefined) return licenseFlag;

  const configDefault = await getConfig('agent-default-license');
  if (configDefault && !silent) {
    logger.info(pc.dim(`Using default license ${configDefault} from teams config.`));
  }
  return configDefault;
}

/**
 * Resolves the Microsoft Graph delegated scopes to grant and make
 * inheritable on a newly created agent blueprint, falling back to the
 * `agent-default-permissions` set via `teams config` when `--permissions`
 * is omitted. Shared by every path that can create a brand-new blueprint
 * (`teams agent blueprint create` and `teams agent user create` without
 * an existing blueprint ID) so the configured default isn't silently
 * dropped by whichever one doesn't call it.
 */
export async function resolveGraphPermissionsDefault(
  permissionsFlag: string | undefined,
  silent: boolean
): Promise<string[] | undefined> {
  const flag = permissionsFlag?.trim();
  const configDefault = !flag ? await getConfig('agent-default-permissions') : undefined;
  if (!flag && configDefault && !silent) {
    logger.info(pc.dim(`Using default Graph permissions "${configDefault}" from teams config.`));
  }
  const scopes = flag ?? configDefault;
  return scopes?.trim()
    ? [...new Set(scopes.split(',').map((s) => s.trim()).filter(Boolean))]
    : undefined;
}
