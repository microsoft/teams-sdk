import { Command } from 'commander';
import pc from 'picocolors';
import { writeFile } from 'node:fs/promises';
import { createSpinner } from 'nanospinner';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../../../auth/index.js';
import { fetchApp, downloadAppPackage } from '../../../apps/index.js';
import { pickApp } from '../../../utils/app-picker.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';

export const packageDownloadCommand = new Command('download')
  .description('Download a Teams app package')
  .argument('[appId]', 'App ID')
  .option('-o, --output <path>', '[OPTIONAL] Output file path (defaults to <appName>.zip)')
  .action(
    wrapAction(async (appIdArg: string | undefined, options) => {
      let appId: string;
      let token: string;

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
        appId = picked.app.teamsAppId;
        token = picked.token;
      }

      const app = await fetchApp(token, appId);
      const outputPath = options.output || `${(app.appName || app.appId).replace(/\s+/g, '-')}.zip`;

      const spinner = createSpinner('Downloading package...').start();
      const packageBuffer = await downloadAppPackage(token, app.appId);
      spinner.stop();

      await writeFile(outputPath, packageBuffer);
      logger.info(pc.green(`Package saved to ${outputPath}`));
    })
  );
