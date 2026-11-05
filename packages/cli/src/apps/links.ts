import pc from 'picocolors';
import { printLinkBanner } from '../utils/browser.js';
import { logger } from '../utils/logger.js';
import { isDevApiEnabled, TDP_HOST } from '../utils/tdp-host.js';

export function installLink(teamsAppId: string, tenantId: string): string {
  return `https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&appTenantId=${tenantId}`;
}

export function portalLink(teamsAppId: string): string {
  return `${TDP_HOST}/apps/${teamsAppId}`;
}

/**
 * Deep link that opens a 1:1 chat with an agentic user in Teams, keyed by
 * their UPN. Requires the agentic user to have a Teams-capable license
 * assigned -- without one, Teams won't be able to resolve the chat.
 */
export function agentChatLink(userPrincipalName: string): string {
  return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(userPrincipalName)}`;
}

/**
 * The install deep link always opens production Teams, which looks the app up
 * in production TDP, so it can't find apps created on dev-int.
 */
export function isInstallLinkSupported(): boolean {
  return !isDevApiEnabled();
}

/** Print the install link, or manual upload steps when the link can't work. */
export function printInstallInstructions(teamsAppId: string, link: string): void {
  if (!isInstallLinkSupported()) {
    // The install link would open production Teams, which can't find dev-int
    // apps, so walk the user through uploading the package manually instead.
    logger.info(
      `  ${pc.bold('▸ Install in Teams')}    ${pc.dim('(dev-int apps must be uploaded manually)')}`
    );
    logger.info(
      `      1. Download the package: ${pc.cyan(`teams app package download ${teamsAppId}`)}`
    );
    logger.info(
      `      2. In Teams: ${pc.dim('Apps → Manage your apps → Upload an app → Upload a custom app')}`
    );
    return;
  }
  printLinkBanner('Install in Teams', link);
}
