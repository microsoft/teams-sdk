import { Command } from 'commander';
import pc from 'picocolors';
import { createSilentSpinner } from '../../utils/spinner.js';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../../auth/index.js';
import { fetchApp, fetchAppDetailsV2, showAppDetail } from '../../apps/index.js';
import { fetchBot } from '../../apps/tdp.js';
import { outputJson } from '../../utils/json-output.js';
import { pickApp } from '../../utils/app-picker.js';
import { CliError, wrapAction } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { printLinkBanner } from '../../utils/browser.js';

interface AppGetOutput {
  appId: string;
  teamsAppId: string;
  name: string;
  longName: string;
  version: string;
  developer: string;
  shortDescription: string;
  longDescription: string;
  websiteUrl: string;
  privacyUrl: string;
  termsOfUseUrl: string;
  endpoint: string | null;
  installLink: string;
  portalLink: string;
}

export const appGetCommand = new Command('get')
  .description('Get a Teams app')
  .argument('[appId]', 'App ID')
  .option('--json', '[OPTIONAL] Output as JSON')
  .option('--web', '[OPTIONAL] Print the install and Developer Portal links')
  .option('--install-link', '[OPTIONAL] Print just the install link (pipe-friendly)')
  .action(
    wrapAction(async (appIdArg: string | undefined, options) => {
      // Interactive picker loop when no appId
      if (!appIdArg) {
        while (true) {
          try {
            const picked = await pickApp();
            const app = await fetchApp(picked.token, picked.app.teamsAppId);
            await showAppDetail(app, picked.token, { interactive: true });
          } catch (error) {
            if (error instanceof Error && error.name === 'ExitPromptError') {
              return;
            }
            throw error;
          }
        }
      }

      // Scripting mode: --id provided
      const account = await getAccount();
      if (!account) {
        throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
      }

      const token = (await getTokenSilent(teamsDevPortalScopes))!;
      if (!token) {
        throw new CliError('AUTH_TOKEN_FAILED', 'Failed to get token.', 'Try `teams login` again.');
      }

      const app = await fetchApp(token, appIdArg);

      if (options.json) {
        const spinner = createSilentSpinner('Fetching app details...', true).start();
        const details = await fetchAppDetailsV2(token, app.teamsAppId);

        // Fetch bot endpoint separately from the bot framework API
        let endpoint: string | null = null;
        if (details.bots && details.bots.length > 0) {
          try {
            const bot = await fetchBot(token, details.bots[0].botId);
            endpoint = bot.messagingEndpoint || null;
          } catch {
            // Bot fetch failed, endpoint remains null
          }
        }

        spinner.stop();

        const enriched: AppGetOutput = {
          appId: details.appId,
          teamsAppId: details.teamsAppId,
          name: details.shortName,
          longName: details.longName,
          version: details.version,
          developer: details.developerName,
          shortDescription: details.shortDescription,
          longDescription: details.longDescription,
          websiteUrl: details.websiteUrl,
          privacyUrl: details.privacyUrl,
          termsOfUseUrl: details.termsOfUseUrl,
          endpoint: endpoint,
          installLink: `https://teams.microsoft.com/l/app/${details.teamsAppId}?installAppPackage=true`,
          portalLink: `https://dev.teams.microsoft.com/apps/${details.teamsAppId}`,
        };

        outputJson(enriched);
        return;
      }

      if (options.installLink) {
        const installLink = `https://teams.microsoft.com/l/app/${app.teamsAppId}?installAppPackage=true`;
        logger.info(installLink);
        return;
      }

      if (options.web) {
        const installLink = `https://teams.microsoft.com/l/app/${app.teamsAppId}?installAppPackage=true`;
        const portalLink = `https://dev.teams.microsoft.com/apps/${app.teamsAppId}`;
        logger.info(`${pc.dim('App:')} ${app.appName || app.appId}`);
        logger.info('');
        printLinkBanner('Install in Teams', installLink);
        printLinkBanner('Developer Portal', portalLink);
        return;
      }

      await showAppDetail(app, token);
    })
  );
