import { Command } from 'commander';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import pc from 'picocolors';
import { logger } from '../utils/logger.js';
import { createSilentSpinner } from '../utils/spinner.js';

const execAsync = promisify(exec);

const PACKAGE_NAME = '@microsoft/teams.cli';

/**
 * Run the self-update. Returns true on success, false on failure.
 */
export async function runSelfUpdate(): Promise<boolean> {
  const spinner = createSilentSpinner('Updating teams...').start();

  try {
    await execAsync(`npm install -g ${PACKAGE_NAME}@latest`);
    spinner.success({ text: 'Updated to the latest version' });

    try {
      const { stdout } = await execAsync('teams --version');
      logger.info(`${pc.dim('Version:')} ${stdout.trim()}`);
    } catch {
      // version check is best-effort
    }
    return true;
  } catch (error) {
    spinner.error({ text: 'Update failed' });
    logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
    logger.info(`\nTry manually: ${pc.cyan(`npm install -g ${PACKAGE_NAME}@latest`)}`);
    return false;
  }
}

export const selfUpdateCommand = new Command('self-update')
  .description('Update teams to the latest version')
  .action(async () => {
    if (!(await runSelfUpdate())) {
      process.exit(1);
    }
  });
