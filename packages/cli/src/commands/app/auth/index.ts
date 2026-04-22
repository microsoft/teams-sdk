import { Command } from 'commander';
import { secretCommand } from './secret/index.js';
import { isInteractive } from '../../../utils/interactive.js';

export const authCommand = new Command('auth')
  .description('Manage app credentials')
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    // Only subcommand is secret — auto-delegate
    await secretCommand.parseAsync([], { from: 'user' });
  });

authCommand.addCommand(secretCommand);
