import open from 'open';
import pc from 'picocolors';
import { logger } from './logger.js';
import { telemetry } from '../telemetry/client.js';
import { isGuid } from '../telemetry/contract.js';

export async function openInBrowser(url: string): Promise<void> {
  let teamsAppId: string | undefined;
  try {
    const parsed = new URL(url);
    const candidate = /^\/l\/app\/([^/]+)$/.exec(parsed.pathname)?.[1];
    if (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'teams.microsoft.com' &&
      isGuid(candidate)
    ) {
      teamsAppId = candidate;
    }
  } catch {
    /* Other browser targets retain their existing behavior. */
  }
  if (teamsAppId) {
    await telemetry().run('app.install_link_open', { teamsAppId }, async () => {
      await open(url);
    });
    return;
  }
  await open(url);
}

export function printLinkBanner(label: string, url: string): void {
  logger.info(`  ${pc.bold(`▸ ${label}`)}    ${pc.dim('→')} ${pc.bold(pc.cyan(url))}`);
}
