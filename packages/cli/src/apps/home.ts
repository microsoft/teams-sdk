import { select } from '@inquirer/prompts';
import pc from 'picocolors';
import { createSpinner } from 'nanospinner';
import type { AppSummary, AppDetails } from './types.js';
import { fetchApp, fetchAppDetailsV2 } from './api.js';
import { fetchBot } from './tdp.js';
import { logger } from '../utils/logger.js';
import { openInBrowser, printLinkBanner } from '../utils/browser.js';

export interface AppDetailData {
  appDetails: AppDetails;
  endpoint: string | null;
  installLink: string;
  portalLink: string;
}

/**
 * Fetch full app details including bot endpoint.
 */
export async function fetchAppDetail(
  appSummary: AppSummary,
  token: string
): Promise<{ appDetails: AppDetails; endpoint: string | null }> {
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

  return { appDetails, endpoint };
}

/**
 * Display-only detail view. Prints app info and links.
 * When interactive, shows action menu before returning.
 */
export async function showAppDetail(
  data: AppDetailData,
  options?: { interactive?: boolean }
): Promise<void> {
  const { appDetails, endpoint, installLink, portalLink } = data;

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
  logger.info('');
  printLinkBanner('Install in Teams', installLink);
  printLinkBanner('Developer Portal', portalLink);

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
