import { select } from '@inquirer/prompts';
import pc from 'picocolors';
import { createSpinner } from 'nanospinner';
import type { AppSummary, AppDetails } from './types.js';
import { fetchApp, fetchAppDetailsV2 } from './api.js';
import { fetchBot } from './tdp.js';
import { logger } from '../utils/logger.js';
import { openInBrowser, printLinkBanner } from '../utils/browser.js';

/**
 * Fetch and print app detail header. Returns the resolved details.
 */
async function printAppHeader(
  appSummary: AppSummary,
  token: string
): Promise<{
  appDetails: AppDetails;
  endpoint: string | null;
  installLink: string;
  portalLink: string;
}> {
  const spinner = createSpinner('Fetching details...').start();

  let appDetails: AppDetails;
  try {
    appDetails = await fetchAppDetailsV2(token, appSummary.teamsAppId);
  } catch {
    const basicApp = await fetchApp(token, appSummary.teamsAppId);
    appDetails = {
      ...basicApp,
      shortName: basicApp.appName ?? '',
      longName: '',
      shortDescription: '',
      longDescription: '',
      developerName: '',
      websiteUrl: '',
      privacyUrl: '',
      termsOfUseUrl: '',
      manifestVersion: '',
      webApplicationInfoId: '',
      mpnId: '',
      accentColor: '',
    } as AppDetails;
  }

  let endpoint: string | null = null;
  if (appDetails.bots && appDetails.bots.length > 0) {
    try {
      const bot = await fetchBot(token, appDetails.bots[0].botId);
      endpoint = bot.messagingEndpoint || null;
    } catch {
      // Bot fetch failed, skip
    }
  }

  spinner.stop();

  logger.info(`\n${pc.bold(appDetails.shortName || 'Unnamed')}`);
  logger.info(`${pc.dim('ID:')} ${appDetails.teamsAppId}`);
  logger.info(`${pc.dim('Version:')} ${appDetails.version ?? 'N/A'}`);
  if (appDetails.longName) {
    logger.info(`${pc.dim('Long name:')} ${appDetails.longName}`);
  }
  logger.info(`${pc.dim('Developer:')} ${appDetails.developerName || pc.dim('(not set)')}`);
  if (appDetails.shortDescription) {
    logger.info(`${pc.dim('Description:')} ${appDetails.shortDescription}`);
  }
  if (endpoint !== null) {
    logger.info(`${pc.dim('Endpoint:')} ${endpoint || pc.yellow('(not set)')}`);
  }
  const installLink = `https://teams.microsoft.com/l/app/${appDetails.teamsAppId}?installAppPackage=true`;
  const portalLink = `https://dev.teams.microsoft.com/apps/${appDetails.teamsAppId}`;
  logger.info('');
  printLinkBanner('Install in Teams', installLink);
  printLinkBanner('Developer Portal', portalLink);

  return { appDetails, endpoint, installLink, portalLink };
}

/**
 * Read-only detail view: prints app info with manage hint.
 * When interactive, shows a "Back" prompt before returning.
 */
export async function showAppDetail(
  appSummary: AppSummary,
  token: string,
  options?: { interactive?: boolean }
): Promise<void> {
  const { appDetails, installLink, portalLink } = await printAppHeader(appSummary, token);
  logger.info(
    pc.dim(`\nTip: ${pc.cyan(`teams app get ${appDetails.teamsAppId}`)} to view this app`)
  );

  if (options?.interactive) {
    try {
      while (true) {
        const action = await select({
          message: '',
          choices: [
            { name: 'Install in Teams', value: 'install' },
            { name: 'Open in Developer Portal', value: 'portal' },
            { name: 'Back', value: 'back' },
          ],
        });
        if (action === 'back') return;
        if (action === 'install') await openInBrowser(installLink);
        if (action === 'portal') await openInBrowser(portalLink);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') return;
      throw error;
    }
  }
}
