import { select } from '@inquirer/prompts';
import pc from 'picocolors';
import type { AppSummary, AppDetails } from './types.js';
import { fetchApp, fetchAppDetailsV2 } from './api.js';
import { fetchBot } from './tdp.js';
import { getBotCommunicationConfiguration, isBotCommunicationApiAvailable } from './bot-communication.js';
import { getCachedAppDetails } from './app-details-cache.js';
import { getCachedBot } from './bot-cache.js';
import { logger } from '../utils/logger.js';
import { openInBrowser, printLinkBanner } from '../utils/browser.js';
import { createSilentSpinner } from '../utils/spinner.js';

export interface AppDetailData {
  appDetails: AppDetails;
  endpoint: string | null;
  /** null when not applicable or unknown (no bot, Azure bot, API unavailable, or read failed). */
  socketMode: boolean | null;
  installLink: string;
  portalLink: string;
}

/**
 * Fetch full app details including bot endpoint and messaging mode.
 */
export async function fetchAppDetail(
  appSummary: AppSummary,
  token: string,
  silent = false
): Promise<{ appDetails: AppDetails; endpoint: string | null; socketMode: boolean | null }> {
  // Skip the spinner entirely when everything we need is already cached — no
  // network round-trip means there's nothing to wait on.
  const cachedDetails = getCachedAppDetails(appSummary.teamsAppId);
  const cachedBotId = cachedDetails?.bots?.[0]?.botId;
  const warm =
    cachedDetails !== undefined &&
    (cachedBotId === undefined || getCachedBot(cachedBotId) !== undefined);

  const spinner = createSilentSpinner('Fetching details...', silent || warm).start();

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
  let socketMode: boolean | null = null;
  if (appDetails.bots && appDetails.bots.length > 0) {
    const botId = appDetails.bots[0].botId;
    let isTeamsManaged = false;
    try {
      const bot = await fetchBot(token, botId);
      endpoint = bot.messagingEndpoint || null;
      isTeamsManaged = true;
    } catch {
      // Bot fetch failed (e.g. Azure bot), skip
    }
    if (isTeamsManaged && isBotCommunicationApiAvailable()) {
      try {
        const config = await getBotCommunicationConfiguration(token, botId);
        socketMode = config?.endpointConfiguration.supportsSocketMode ?? false;
      } catch {
        // Leave as unknown
      }
    }
  }

  spinner.stop();

  return { appDetails, endpoint, socketMode };
}

/**
 * Display-only detail view. Prints app info and links.
 * When interactive, shows action menu before returning.
 */
export async function showAppDetail(
  data: AppDetailData,
  options?: { interactive?: boolean }
): Promise<void> {
  const { appDetails, endpoint, socketMode, installLink, portalLink } = data;

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
  if (socketMode !== null) {
    logger.info(`${pc.dim('Messaging:')} ${socketMode ? 'Socket mode' : 'HTTP'}`);
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
