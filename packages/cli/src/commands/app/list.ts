import { Command } from 'commander';
import { search } from '@inquirer/prompts';
import { createSilentSpinner } from '../../utils/spinner.js';
import pc from 'picocolors';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../../auth/index.js';
import { fetchApps, fetchApp } from '../../apps/index.js';
import { showAppActions } from './actions.js';
import { outputJson } from '../../utils/json-output.js';
import { isInteractive } from '../../utils/interactive.js';
import { CliError, wrapAction } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export async function runAppList(options?: { json?: boolean }): Promise<void> {
  const account = await getAccount();
  if (!account) {
    throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
  }

  const token = await getTokenSilent(teamsDevPortalScopes);
  if (!token) {
    throw new CliError('AUTH_TOKEN_FAILED', 'Failed to get token.', 'Try `teams login` again.');
  }

  const silent = !!options?.json;
  const spinner = createSilentSpinner('Fetching apps...', silent).start();
  let apps;
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
    if (options?.json) {
      outputJson([]);
      return;
    }
    logger.info(pc.dim('No apps found.'));
    return;
  }

  if (options?.json) {
    outputJson(apps);
    return;
  }

  if (!isInteractive()) {
    // Non-interactive: output all apps as JSON
    outputJson(apps);
    return;
  }

  while (true) {
    try {
      const selected = await search({
        message: 'Select an app',
        source: (term) => {
          const filtered = term
            ? apps.filter((app) => (app.appName ?? '').toLowerCase().includes(term.toLowerCase()))
            : apps;
          return filtered.map((app) => ({
            name: `${app.appName ?? 'Unnamed'} ${pc.dim(`(${app.teamsAppId})`)}`,
            value: app,
          }));
        },
      });

      const app = await fetchApp(token, selected.teamsAppId);
      await showAppActions(app, token);
    } catch (error) {
      // User cancelled prompt (Escape/Ctrl+C), exit gracefully
      if (error instanceof Error && error.name === 'ExitPromptError') {
        return;
      }
      throw error;
    }
  }
}

export const appListCommand = new Command('list')
  .description('List your Teams apps')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (options) => {
      await runAppList(options);
    })
  );
