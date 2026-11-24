import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import pc from 'picocolors';
import { getConfig } from '../../utils/config.js';
import { isInteractive } from '../../utils/interactive.js';
import type { BotLocation } from '../../apps/bot-location.js';
import { configGetCommand } from './get.js';
import { configSetCommand } from './set.js';

const AGENT_CONFIG_MENU_ITEMS: { name: string; key: string }[] = [
  { name: 'Agent default usage location', key: 'agent-default-usage-location' },
  { name: 'Agent default license', key: 'agent-default-license' },
  { name: 'Agent default permissions', key: 'agent-default-permissions' },
];

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
            ...(await Promise.all(
              AGENT_CONFIG_MENU_ITEMS.map(async ({ name, key }) => {
                const current = await getConfig(key);
                return { name: `${name} ${pc.dim(`(${current ?? 'not set'})`)}`, value: key };
              })
            )),
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
