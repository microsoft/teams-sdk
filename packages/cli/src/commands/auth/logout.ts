import { Command } from 'commander';
import { createSilentSpinner } from '../../utils/spinner.js';
import { logout, getAccount } from '../../auth/index.js';
import { logger } from '../../utils/logger.js';

export const logoutCommand = new Command('logout')
  .description('Log out of Microsoft 365')
  .action(async () => {
    const account = await getAccount();

    if (!account) {
      logger.info('Not logged in.');
      return;
    }

    const spinner = createSilentSpinner('Logging out...').start();
    await logout();
    spinner.success({ text: `Logged out of ${account.username}` });
  });
