import { Command } from 'commander';
import { createSilentSpinner } from '../../utils/spinner.js';
import { login, getAccount } from '../../auth/index.js';
import { logger } from '../../utils/logger.js';
import { isInteractive, isLocalSession } from '../../utils/interactive.js';
import { wrapAction } from '../../utils/errors.js';
import { checkAndDisplayEnvironment } from '../../utils/environment.js';
import { telemetry } from '../../telemetry/client.js';

interface LoginCommandOptions {
  deviceCode?: boolean;
}

export const loginCommand = new Command('login')
  .description('Log in to Microsoft 365')
  .option('--device-code', '[OPTIONAL] Use device code flow instead of opening a browser')
  .action(
    wrapAction(async (options: LoginCommandOptions) => {
      await telemetry().run('auth.login', {}, async (operation) => {
        const existingAccount = await getAccount();

        if (existingAccount) {
          operation.update({ authMode: 'cached', tenantId: existingAccount.tenantId });
          logger.info(`Already logged in as ${existingAccount.username}`);
          logger.info('Run "teams logout" first to switch accounts.');
          return;
        }

        const forceDeviceCode = options.deviceCode;
        const useBrowser = !forceDeviceCode && isInteractive() && isLocalSession();
        operation.update({ authMode: useBrowser ? 'browser' : 'device_code' });

        let account;
        if (useBrowser) {
          const spinner = createSilentSpinner('Opening browser for login...').start();
          try {
            account = await login();
            spinner.success({ text: `Logged in as ${account.username}` });
          } catch (error) {
            spinner.error({ text: 'Login failed' });
            throw error;
          }
        } else {
          // No spinner for device code — MSAL prints the code/URL to stdout
          account = await login({ forceDeviceCode });
          logger.info(`Logged in as ${account.username}`);
        }

        operation.update({ tenantId: account.tenantId });
        await operation.complete();
        await checkAndDisplayEnvironment(account);
      });
    })
  );
