import { Command } from 'commander';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../../../../auth/index.js';
import { CliError, wrapAction } from '../../../../utils/errors.js';
import { pickApp } from '../../../../utils/app-picker.js';
import { generateSecret } from './generate.js';

interface SecretCreateOptions {
  env?: string;
  json?: boolean;
}

export const secretCreateCommand = new Command('create')
  .description('Generate a new client secret for an existing app')
  .argument('[appId]', 'App ID')
  .option('--env <path>', '[OPTIONAL] Path to .env file to write credentials')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (appIdArg: string | undefined, options: SecretCreateOptions) => {
      let appId: string;
      let tdpToken: string;

      if (appIdArg) {
        const account = await getAccount();
        if (!account) {
          throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
        }

        const token = await getTokenSilent(teamsDevPortalScopes);
        if (!token) {
          throw new CliError(
            'AUTH_TOKEN_FAILED',
            'Failed to get TDP token.',
            'Try `teams login` again.'
          );
        }
        appId = appIdArg;
        tdpToken = token;
      } else {
        const picked = await pickApp();
        appId = picked.app.teamsAppId;
        tdpToken = picked.token;
      }

      await generateSecret({
        tdpToken,
        appId,
        envPath: options.env,
        interactive: !options.env && !options.json,
        json: options.json,
      });
    })
  );
