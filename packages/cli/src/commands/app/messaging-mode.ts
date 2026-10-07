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

export function promptMessagingMode(defaultMode?: MessagingMode): Promise<MessagingMode> {
  return select<MessagingMode>({
    message: 'How should Teams deliver messages to your app?',
    default: defaultMode,
    choices: [
      { name: 'Sockets (Easy to get started, best for local development)', value: 'socket' },
      { name: 'HTTP endpoint (Best used in production or with tunnels)', value: 'http' },
    ],
  });
}
