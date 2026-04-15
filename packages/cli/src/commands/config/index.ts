import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import pc from 'picocolors';
import { getConfig, setConfig } from '../../utils/config.js';
import { isInteractive } from '../../utils/interactive.js';
import { CliError, wrapAction } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import type { BotLocation } from '../../apps/bot-location.js';
import { setLangCommand } from './set-lang.js';

const botLocationCommand = new Command('default-bot-location')
  .description('Default bot location for app create (teams-managed or azure)')
  .argument(
    '[value]',
    "Set to 'teams-managed' or 'azure'. Omit to show current value or pick interactively."
  )
  .action(
    wrapAction(async (value?: string) => {
      const current = ((await getConfig('default-bot-location')) as BotLocation) ?? 'tm';

      if (!value && isInteractive()) {
        value = await select({
          message: 'Default bot location',
          choices: [
            { name: 'Teams managed (no Azure subscription needed)', value: 'tm' },
            { name: 'Azure (requires az CLI + subscription)', value: 'azure' },
          ],
          default: current,
        });
      }

      if (!value) {
        logger.info(current === 'tm' ? 'teams-managed' : 'azure');
        return;
      }

      // Accept "teams-managed" as alias for internal "tm" value
      if (value === 'teams-managed') value = 'tm';

      if (value !== 'tm' && value !== 'azure') {
        throw new CliError(
          'VALIDATION_FORMAT',
          `Invalid value: ${value}. Must be 'teams-managed' or 'azure'.`
        );
      }

      if (value === current) {
        const displayValue = value === 'tm' ? 'teams-managed' : 'azure';
        logger.info(pc.dim(`default-bot-location is already ${displayValue}`));
        return;
      }

      await setConfig('default-bot-location', value);
      const displayValue = value === 'tm' ? 'teams-managed' : 'azure';
      logger.info(`${pc.dim('default-bot-location')} = ${pc.bold(pc.green(displayValue))}`);
    })
  );

export const configCommand = new Command('config')
  .description('Manage CLI configuration')
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    while (true) {
      const currentBotLoc = ((await getConfig('default-bot-location')) as BotLocation) ?? 'tm';
      const currentLang = (await getConfig('language')) ?? 'not set';

      try {
        const setting = await select({
          message: 'Configure',
          choices: [
            {
              name: `Default bot location ${pc.dim(`(${currentBotLoc === 'tm' ? 'teams-managed' : 'azure'})`)}`,
              value: 'default-bot-location',
            },
            { name: `Default language ${pc.dim(`(${currentLang})`)}`, value: 'set-lang' },
            { name: 'Back', value: 'back' },
          ],
        });

        if (setting === 'back') return;

        if (setting === 'default-bot-location') {
          await botLocationCommand.parseAsync([], { from: 'user' });
        } else if (setting === 'set-lang') {
          await setLangCommand.parseAsync([], { from: 'user' });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') return;
        throw error;
      }
    }
  });

configCommand.addCommand(botLocationCommand);
configCommand.addCommand(setLangCommand);
