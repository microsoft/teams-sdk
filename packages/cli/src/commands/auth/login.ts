import { Command } from 'commander';
import { createSpinner } from 'nanospinner';
import { login, getAccount } from '../../auth/index.js';
import { logger } from '../../utils/logger.js';
import { isInteractive, isLocalSession } from '../../utils/interactive.js';
import { wrapAction } from '../../utils/errors.js';

interface LoginCommandOptions {
  deviceCode?: boolean;
}

export const loginCommand = new Command('login')
  .description('Log in to Microsoft 365')
  .option('--device-code', '[OPTIONAL] Use device code flow instead of opening a browser')
  .action(
    wrapAction(async (options: LoginCommandOptions) => {
      const existingAccount = await getAccount();

      if (existingAccount) {
        logger.info(`Already logged in as ${existingAccount.username}`);
        logger.info('Run "teams logout" first to switch accounts.');
        return;
      }

      const forceDeviceCode = options.deviceCode;
      const useBrowser = !forceDeviceCode && isInteractive() && isLocalSession();

      if (useBrowser) {
        const spinner = createSpinner('Opening browser for login...').start();
        try {
          const account = await login();
          spinner.success({ text: `Logged in as ${account.username}` });
        } catch (error) {
          spinner.error({ text: 'Login failed' });
          throw error;
        }
      } else {
        // No spinner for device code — MSAL prints the code/URL to stdout
        const account = await login({ forceDeviceCode });
        logger.info(`Logged in as ${account.username}`);
      }
    })
  );
