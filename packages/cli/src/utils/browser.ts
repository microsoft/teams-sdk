import open from 'open';
import pc from 'picocolors';
import { logger } from './logger.js';

export async function openInBrowser(url: string): Promise<void> {
  await open(url);
}

export function printLinkBanner(label: string, url: string): void {
  logger.info(`  ${pc.bold(`▸ ${label}`)}    ${pc.dim('→')} ${pc.bold(pc.cyan(url))}`);
}

/**
 * Wraps `label` in an OSC 8 terminal hyperlink pointing at `url`, so
 * terminals that support it (Windows Terminal, iTerm2, VS Code, etc.) render
 * clickable text instead of a separately printed raw URL. Unsupported
 * terminals just show `label`, so the link text itself must still read
 * sensibly on its own.
 */
export function hyperlink(label: string, url: string): string {
  return `\u001B]8;;${url}\u0007${label}\u001B]8;;\u0007`;
}
