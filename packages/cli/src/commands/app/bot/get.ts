import { Command } from 'commander';
import pc from 'picocolors';
import { createSilentSpinner } from '../../../utils/spinner.js';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../../../auth/index.js';
import { fetchApp, fetchAppDetailsV2, getBotLocation } from '../../../apps/index.js';
import { pickApp } from '../../../utils/app-picker.js';
import { isInteractive } from '../../../utils/interactive.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';

export const botGetCommand = new Command('get')
  .description('Get bot registration details')
  .argument('[appId]', 'App ID')
  .action(
    wrapAction(async (appIdArg?: string) => {
      let token: string;
      let appId: string;

      if (appIdArg) {
        const account = await getAccount();
        if (!account) {
          throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
        }
        token = (await getTokenSilent(teamsDevPortalScopes))!;
        if (!token) {
          throw new CliError(
            'AUTH_TOKEN_FAILED',
            'Failed to get token.',
            'Try `teams login` again.'
          );
        }
        appId = appIdArg;
      } else {
        const picked = await pickApp();
        token = picked.token;
        appId = picked.app.teamsAppId;
      }

      const details = await fetchAppDetailsV2(token, appId);
      if (!details.bots || details.bots.length === 0) {
        throw new CliError('NOT_FOUND_BOT', 'This app has no bots.');
      }

      const botId = details.bots[0].botId;
      const spinner = createSilentSpinner('Checking bot location...').start();
      const location = await getBotLocation(token, botId);
      spinner.stop();

      if (isInteractive()) {
        const label = location === 'tm' ? 'Teams (managed)' : 'Azure';
        logger.info(`${pc.dim('Bot ID:')} ${botId}`);
        logger.info(`${pc.dim('Location:')} ${label}`);
      } else {
        // Plain output for scripting
        logger.info(location);
      }
    })
  );
