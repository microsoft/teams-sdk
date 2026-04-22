import { Command } from 'commander';
import pc from 'picocolors';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../../auth/index.js';
import { fetchApp, fetchAppDetail, showAppDetail, installLink, portalLink } from '../../apps/index.js';
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
            const pickedAccount = await getAccount();
            const app = await fetchApp(picked.token, picked.app.teamsAppId);
            const { appDetails, endpoint } = await fetchAppDetail(app, picked.token);
            const tenantId = pickedAccount?.tenantId ?? '';
            await showAppDetail({
              appDetails,
              endpoint,
              installLink: installLink(appDetails.teamsAppId, tenantId),
              portalLink: portalLink(appDetails.teamsAppId),
            }, { interactive: true });
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
      const tenantId = account.tenantId;

      if (options.json) {
        const { appDetails, endpoint } = await fetchAppDetail(app, token);

        const enriched: AppGetOutput = {
          appId: appDetails.appId,
          teamsAppId: appDetails.teamsAppId,
          name: appDetails.shortName,
          longName: appDetails.longName,
          version: appDetails.version,
          developer: appDetails.developerName,
          shortDescription: appDetails.shortDescription,
          longDescription: appDetails.longDescription,
          websiteUrl: appDetails.websiteUrl,
          privacyUrl: appDetails.privacyUrl,
          termsOfUseUrl: appDetails.termsOfUseUrl,
          endpoint,
          installLink: installLink(appDetails.teamsAppId, tenantId),
          portalLink: portalLink(appDetails.teamsAppId),
        };

        outputJson(enriched);
        return;
      }

      if (options.installLink) {
        logger.info(installLink(app.teamsAppId, tenantId));
        return;
      }

      if (options.web) {
        const install = installLink(app.teamsAppId, tenantId);
        const portal = portalLink(app.teamsAppId);
        logger.info(`${pc.dim('App:')} ${app.appName || app.appId}`);
        logger.info('');
        printLinkBanner('Install in Teams', install);
        printLinkBanner('Developer Portal', portal);
        return;
      }

      const { appDetails, endpoint } = await fetchAppDetail(app, token);
      await showAppDetail({
        appDetails,
        endpoint,
        installLink: installLink(appDetails.teamsAppId, tenantId),
        portalLink: portalLink(appDetails.teamsAppId),
      });
    })
  );
