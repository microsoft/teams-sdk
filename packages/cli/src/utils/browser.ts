import open from 'open';
import pc from 'picocolors';
import { logger } from './logger.js';

export async function openInBrowser(url: string): Promise<void> {
  await open(url);
}

export function printLinkBanner(label: string, url: string): void {
  logger.info(`  ${pc.bold(`▸ ${label}`)}    ${pc.dim('→')} ${pc.bold(pc.cyan(url))}`);
}
