import type { AccountInfo } from '@azure/msal-node';
import { input } from '@inquirer/prompts';
import { getAccount } from '../../auth/index.js';
import { ensureTenantMatch } from '../../utils/az-prompts.js';
import { CliError } from '../../utils/errors.js';
import { isInteractive } from '../../utils/interactive.js';
import { createSilentSpinner } from '../../utils/spinner.js';

/**
 * Preflight shared by every `teams agent` subcommand: requires a logged-in
 * account and verifies the Azure CLI's active tenant matches it. Returns
 * the account for commands that need it (e.g. tenantId).
 */
export async function requireAgentAccount(): Promise<AccountInfo> {
  const account = await getAccount();
  if (!account) {
    throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
  }
  await ensureTenantMatch(account.tenantId);
  return account;
}

/**
 * Resolves the display name for a brand-new agent blueprint: the `[name]`
 * argument if given, otherwise an interactive prompt. Shared by `teams
 * agent blueprint create` and `teams agent user create` (which creates a
 * blueprint on the fly when no blueprint ID is given).
 */
export async function resolveAgentName(nameArg: string | undefined, silent: boolean): Promise<string> {
  if (nameArg?.trim()) return nameArg.trim();

  if (!isInteractive() || silent) {
    throw new CliError(
      'AGENT_NAME_REQUIRED',
      'An agent name is required in non-interactive mode.',
      'Pass it as an argument, e.g. `teams agent blueprint create <name>`.'
    );
  }

  const name = await input({ message: 'Blueprint name:' });
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
