import { Command } from 'commander';
import pc from 'picocolors';
import { logger } from '../utils/logger.js';
import {
  getExecutableLocation,
  getSelfUpdateCommand,
  getSelfUpdateUnavailableInstruction,
  runSelfUpdateCommand,
} from '../utils/self-update.js';
import { fetchLatestVersion, getCurrentVersion, isNewerVersion } from '../utils/update-info.js';

interface SelfUpdateOptions {
  force?: boolean;
}

interface SelfUpdatePlan {
  shouldRun: boolean;
}

async function getSelfUpdatePlan(force: boolean): Promise<SelfUpdatePlan> {
  if (force) return { shouldRun: true };

  const latestVersion = await fetchLatestVersion();
  const currentVersion = getCurrentVersion();

  // If the registry check fails, still try the package-manager update. A manual
  // self-update should not be blocked by a best-effort preflight network check.
  if (!latestVersion) return { shouldRun: true };

  if (isNewerVersion(latestVersion, currentVersion)) {
    return { shouldRun: true };
  }

  logger.info(pc.green(`teams is already up to date (${currentVersion})`));
  return { shouldRun: false };
}

/**
 * Run the self-update. Returns true on success, false on failure.
 */
export async function runSelfUpdate(options: SelfUpdateOptions = {}): Promise<boolean> {
  const command = getSelfUpdateCommand();

  if (!command) {
    logger.error(pc.red('teams cannot self-update this installation.'));
    logger.error(getSelfUpdateUnavailableInstruction());

    const executableLocation = getExecutableLocation();
    if (executableLocation) {
      logger.error(`\nLocation of teams executable: ${executableLocation}`);
    }

    return false;
  }

  const plan = await getSelfUpdatePlan(!!options.force);
  if (!plan.shouldRun) {
    return true;
  }

  logger.info(pc.dim(`Updating teams with ${command.display}...`));

  try {
    await runSelfUpdateCommand(command);
    logger.info(pc.green('Updated to the latest version'));
    return true;
  } catch (error) {
    logger.error(pc.red('Update failed'));
    logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
    logger.info(`\nTry manually: ${pc.cyan(command.display)}`);
    return false;
  }
}

export const selfUpdateCommand = new Command('self-update')
  .description('Update teams to the latest version')
  .option('--force', '[OPTIONAL] Run update even when the current version is already up to date')
  .action(async (options: SelfUpdateOptions) => {
    if (!(await runSelfUpdate(options))) {
      process.exit(1);
    }
  });
