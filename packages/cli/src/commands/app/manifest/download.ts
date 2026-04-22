import { Command } from 'commander';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../../../auth/index.js';
import { pickApp } from '../../../utils/app-picker.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { downloadManifest } from './actions.js';

export const manifestDownloadCommand = new Command('download')
  .description('Download manifest from a Teams app')
  .argument('[appId]', 'App ID')
  .argument('[file-path]', 'Output file path (displays to stdout if not provided)')
  .action(
    wrapAction(async (appIdArg: string | undefined, filePath: string | undefined) => {
      // Disambiguate: if only one arg and it looks like a file path, treat as filePath
      if (
        appIdArg &&
        !filePath &&
        (appIdArg.includes('/') || appIdArg.includes('\\') || appIdArg.endsWith('.json'))
      ) {
        filePath = appIdArg;
        appIdArg = undefined;
      }

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
        appId = picked.app.appId;
        token = picked.token;
      }

      await downloadManifest(token, appId, filePath);
    })
  );
