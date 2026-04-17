import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import pc from 'picocolors';
import { getConfig } from '../../utils/config.js';
import { isInteractive } from '../../utils/interactive.js';
import type { BotLocation } from '../../apps/bot-location.js';
import { configGetCommand } from './get.js';
import { configSetCommand } from './set.js';

export const configCommand = new Command('config')
  .description('Manage CLI configuration')
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    while (true) {
      const currentBotLoc = ((await getConfig('default-bot-location')) as BotLocation) ?? 'tm';

      try {
        const setting = await select({
          message: 'Configure',
          choices: [
            {
              name: `Default bot location ${pc.dim(`(${currentBotLoc === 'tm' ? 'teams-managed' : 'azure'})`)}`,
              value: 'default-bot-location',
            },
            { name: 'Back', value: 'back' },
          ],
        });

        if (setting === 'back') return;

        await configSetCommand.parseAsync([setting], { from: 'user' });
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') return;
        throw error;
      }
    }
  });

configCommand.addCommand(configGetCommand);
configCommand.addCommand(configSetCommand);
