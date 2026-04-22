import { Command } from 'commander';
import { createSpinner } from 'nanospinner';
import { login, getAccount } from '../../auth/index.js';
import { logger } from '../../utils/logger.js';
import { isInteractive, isLocalSession } from '../../utils/interactive.js';

interface LoginCommandOptions {
  deviceCode?: boolean;
}

export const loginCommand = new Command('login')
  .description('Log in to Microsoft 365')
  .option('--device-code', '[OPTIONAL] Use device code flow instead of opening a browser')
  .action(async (options: LoginCommandOptions) => {
    const existingAccount = await getAccount();

    if (existingAccount) {
      logger.info(`Already logged in as ${existingAccount.username}`);
      logger.info('Run "teams logout" first to switch accounts.');
      return;
    }

    const useDeviceCode = options.deviceCode;
    const useBrowser = !useDeviceCode && isInteractive() && isLocalSession();
    const spinner = createSpinner(
      useBrowser ? 'Opening browser for login...' : 'Authenticating...'
    ).start();
    try {
      const account = await login({ useDeviceCode });
      spinner.success({ text: `Logged in as ${account.username}` });
    } catch (error) {
      spinner.error({ text: 'Login failed' });
      if (error instanceof Error) {
        logger.error(error.message);
      }
      process.exit(1);
    }
  });
