import { select } from '@inquirer/prompts';
import { CliError } from '../../utils/errors.js';

export type MessagingMode = 'socket' | 'http';

const MESSAGING_MODES: readonly MessagingMode[] = ['socket', 'http'];

export function parseMessagingMode(value: string): MessagingMode {
  if (!(MESSAGING_MODES as readonly string[]).includes(value)) {
    throw new CliError('VALIDATION_FORMAT', '--messaging-mode must be socket or http.');
  }
  return value as MessagingMode;
}

const MODE_LABELS: Record<MessagingMode, string> = {
  socket: 'Sockets',
  http: 'HTTP endpoint',
};

export function promptMessagingMode(currentMode?: MessagingMode): Promise<MessagingMode> {
  const suffix = currentMode ? ` (Current mode: ${MODE_LABELS[currentMode]})` : '';
  return select<MessagingMode>({
    message: `How should Teams deliver messages to your app?${suffix}`,
    default: currentMode,
    choices: [
      { name: 'Sockets (Easy to get started, best for local development)', value: 'socket' },
      { name: 'HTTP endpoint (Best used in production or with tunnels)', value: 'http' },
    ],
  });
}
