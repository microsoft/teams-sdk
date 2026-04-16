import { search } from '@inquirer/prompts';
import pc from 'picocolors';
import { createSpinner } from 'nanospinner';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../auth/index.js';
import { fetchApps } from '../apps/index.js';
import type { AppSummary } from '../apps/types.js';
import { isInteractive } from './interactive.js';
import { CliError } from './errors.js';
import { logger } from './logger.js';

export interface PickAppResult {
  app: AppSummary;
  token: string;
}

/**
 * Authenticate, fetch apps, and show a searchable picker.
 * Returns the selected app and the TDP token for further API calls.
 * In non-TTY environments, prints an error and exits (prompts can't work).
 */
export async function pickApp(): Promise<PickAppResult> {
  if (!isInteractive()) {
    throw new CliError(
      'VALIDATION_MISSING',
      'Missing app ID.',
      'Pass <appId> as the first argument in non-interactive mode.'
    );
  }

  const account = await getAccount();
  if (!account) {
    throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
  }

  const token = await getTokenSilent(teamsDevPortalScopes);
  if (!token) {
    throw new CliError('AUTH_TOKEN_FAILED', 'Failed to get token.', 'Try `teams login` again.');
  }

  const spinner = createSpinner('Fetching apps...').start();
  let apps: AppSummary[];
  try {
    apps = await fetchApps(token);
    spinner.stop();
  } catch (error) {
    spinner.error({ text: 'Failed to fetch apps' });
    throw new CliError(
      'API_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch apps'
    );
  }

  if (apps.length === 0) {
    logger.info(pc.dim('No apps found.'));
    process.exit(0);
  }

  logger.info(pc.dim(`Tip: pass ${pc.cyan('<appId>')} as the first argument to skip this prompt`));

  try {
    const app = await search({
      message: 'Select an app',
      source: (term) => {
        const filtered = term
          ? apps.filter((a) => (a.appName ?? '').toLowerCase().includes(term.toLowerCase()))
          : apps;
        return filtered.map((a) => ({
          name: `${a.appName ?? 'Unnamed'} ${pc.dim(`(${a.teamsAppId})`)}`,
          value: a,
        }));
      },
    });

    return { app, token };
  } catch (error) {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      process.exit(0);
    }
    throw error;
  }
}
