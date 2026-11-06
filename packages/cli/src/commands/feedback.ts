import { Command } from 'commander';
import pc from 'picocolors';
import { openInBrowser } from '../utils/browser.js';
import { wrapAction } from '../utils/errors.js';
import { isInteractive, isLocalSession } from '../utils/interactive.js';
import { outputJson } from '../utils/json-output.js';
import { logger } from '../utils/logger.js';
import { getCurrentVersion } from '../utils/update-info.js';

interface FeedbackOptions {
  json?: boolean;
}

interface FeedbackOutput {
  url: string;
}

const FEEDBACK_URL = 'https://github.com/microsoft/teams-sdk/issues/new?template=cli.yml';

export const feedbackCommand = new Command('feedback')
  .description('Open the CLI feedback issue form on GitHub')
  .option('--json', '[OPTIONAL] Output the feedback URL as JSON without opening a browser')
  .action(
    wrapAction(async (options: FeedbackOptions): Promise<void> => {
      const url = new URL(FEEDBACK_URL);
      url.searchParams.set('cli-version', getCurrentVersion());
      url.searchParams.set('node-version', process.version);
      const feedbackUrl = url.toString();

      if (options.json) {
        const output: FeedbackOutput = { url: feedbackUrl };
        outputJson(output);
        return;
      }

      logger.info(`Submit CLI feedback on GitHub: ${pc.cyan(feedbackUrl)}`);
      if (isInteractive() && isLocalSession()) {
        await openInBrowser(feedbackUrl);
      }
    })
  );
