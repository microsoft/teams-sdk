import { confirm } from '@inquirer/prompts';

/**
 * Check whether the session is interactive (can show prompts).
 * Returns false when stdin is not a TTY or TEAMS_NO_INTERACTIVE is set.
 */
export function isInteractive(): boolean {
  if (process.env.TEAMS_NO_INTERACTIVE) return false;
  return !!process.stdin.isTTY;
}

/**
 * Check whether the session is local (i.e. not an SSH remote session).
 * SSH sessions allocate a TTY so isInteractive() can return true, but
 * a browser cannot be opened on the remote server side.
 * Returns false when SSH_CONNECTION or SSH_CLIENT is set.
 */
export function isLocalSession(): boolean {
  return !process.env.SSH_CONNECTION && !process.env.SSH_CLIENT;
}

let autoConfirm = false;

export function setAutoConfirm(value: boolean): void {
  autoConfirm = value;
}

export function isAutoConfirm(): boolean {
  return autoConfirm;
}

/**
 * Confirm a major action before proceeding.
 * - Returns true immediately when --yes is active.
 * - Returns true immediately in silent or non-interactive mode.
 * - Otherwise, prompts the user in interactive mode.
 */
export async function confirmAction(message: string, silent = false): Promise<boolean> {
  if (autoConfirm) return true;
  if (silent) return true;
  if (!isInteractive()) return true;
  return confirm({ message, default: true });
}
