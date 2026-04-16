import { Command } from 'commander';
import { packageDownloadCommand } from './download.js';
import { isInteractive } from '../../../utils/interactive.js';

export const appPackageCommand = new Command('package')
  .description('Manage app packages')
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    await packageDownloadCommand.parseAsync([], { from: 'user' });
  });

appPackageCommand.addCommand(packageDownloadCommand);
