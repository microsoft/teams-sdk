import { Command } from 'commander';
import { secretCreateCommand } from './create.js';
import { isInteractive } from '../../../../utils/interactive.js';

export const secretCommand = new Command('secret')
  .description('Manage app secrets')
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    await secretCreateCommand.parseAsync([], { from: 'user' });
  });

secretCommand.addCommand(secretCreateCommand);
