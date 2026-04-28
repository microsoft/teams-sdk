import { Command } from 'commander';
import pc from 'picocolors';
import { getAccount, paths } from '../auth/index.js';
import { wrapAction } from '../utils/errors.js';
import { isVerbose, logger } from '../utils/logger.js';
import { outputJson } from '../utils/json-output.js';
import {
  checkAndDisplayEnvironment,
  type EnvironmentCheckResult,
} from '../utils/environment.js';

interface StatusOptions {
  json?: boolean;
}

interface StatusOutput {
  loggedIn: boolean;
  username: string | null;
  tenantId: string | null;
  userObjectId: string | null;
  tdp: EnvironmentCheckResult['tdp'];
  azureCli: EnvironmentCheckResult['azureCli'];
}

export const statusCommand = new Command('status')
  .description('Show current CLI status')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (options: StatusOptions) => {
      const silent = !!options.json;
      const account = await getAccount();

      const output: StatusOutput = {
        loggedIn: false,
        username: null,
        tenantId: null,
        userObjectId: null,
        tdp: null,
        azureCli: { installed: false, loggedIn: false, subscription: null, tenantId: null, tenantMatch: null },
      };

      if (!account) {
        if (!silent) {
          logger.info(`${pc.yellow('⚠')} Not logged in`);
          logger.info(`  Run ${pc.cyan('teams login')} to authenticate.`);
        }
        if (options.json) outputJson(output);
        return;
      }

      output.loggedIn = true;
      output.username = account.username;
      output.tenantId = account.tenantId;
      output.userObjectId = account.localAccountId;

      if (!silent) {
        logger.info(`${pc.green('✔')} Logged in as ${pc.bold(account.username)}`);

        if (isVerbose()) {
          logger.info(`  ${pc.dim('Tenant ID:')} ${account.tenantId}`);
          logger.info(`  ${pc.dim('User Object ID:')} ${account.localAccountId}`);
          logger.info(`  ${pc.dim('Config path:')} ${paths.config}`);
        }
      }

      const envResult = await checkAndDisplayEnvironment(account, silent);
      output.tdp = envResult.tdp;
      output.azureCli = envResult.azureCli;

      if (options.json) outputJson(output);
    })
  );
