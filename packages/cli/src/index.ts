#!/usr/bin/env node
import { createRequire } from 'node:module';
import { program, Command, CommanderError } from 'commander';
import { loginCommand, logoutCommand } from './commands/auth/index.js';
import { statusCommand } from './commands/status.js';
import { feedbackCommand } from './commands/feedback.js';
import { appCommand } from './commands/app/index.js';
import { selfUpdateCommand } from './commands/self-update.js';
import { configCommand } from './commands/config/index.js';
import { projectCommand } from './commands/project/index.js';
import { CliError } from './utils/errors.js';
import { handleJsonHelp } from './utils/json-help.js';
import { logger, setVerbose } from './utils/logger.js';
import { isInteractive, setAutoConfirm } from './utils/interactive.js';
import { checkForUpdates } from './utils/update-check.js';
import pc from 'picocolors';
import { startTelemetry, setTelemetry, telemetry } from './telemetry/client.js';
import type { Outcome } from './telemetry/contract.js';
import { installTelemetrySignalHandlers } from './telemetry/signals.js';
import { stopSpinners } from './utils/spinner.js';
import { getCancellationSignal } from './utils/cancellation.js';

// Safety net: catch CliError thrown from shared utilities in non-wrapped commands
process.on('unhandledRejection', async (error) => {
  stopSpinners();
  if (getCancellationSignal()?.aborted) {
    await telemetry().close('cancelled');
    return;
  }
  if (error instanceof CliError) {
    logger.error(pc.red(error.message));
    if (error.suggestion) logger.error(error.suggestion);
  } else {
    logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
  }
  await telemetry().close('failed');
  process.exit(1);
});

const require = createRequire(import.meta.url);
const { version }: { version: string } = require('../package.json');

// Teams brand purple (#7B83EB) via truecolor escape
function teamsColor(text: string): string {
  if (!process.stdout.isTTY) return text;
  return `\x1b[38;2;123;131;235m${text}\x1b[39m`;
}

program
  .name('teams')
  .description('Teams Developer CLI for managing Microsoft Teams apps')
  .addHelpText('beforeAll', `${pc.bold(teamsColor('Teams Developer CLI'))}\n`)
  .version(version)
  .option('-v, --verbose', '[OPTIONAL] Enable verbose logging')
  .option('-y, --yes', '[OPTIONAL] Auto-confirm prompts (for CI/agent use)')
  .option('--disable-auto-update', '[OPTIONAL] Disable automatic update checks')
  .helpOption('-h, --help', 'Display help (use with --json for structured output)')
  .addHelpText('after', () => {
    const status = isInteractive() ? pc.green('on') : pc.yellow('off');
    return `\nInteractive mode: ${status}\n  Set ${pc.cyan('TEAMS_NO_INTERACTIVE=1')} to disable, unset to enable.\n\nOptional usage telemetry: off by default; collection disabled pending release approval.\n  Manage your choice with ${pc.cyan('teams config set telemetry on|off')}.\n  Privacy: https://privacy.microsoft.com/privacystatement`;
  })
  .hook('preAction', async (thisCommand, actionCommand) => {
    const opts = thisCommand.optsWithGlobals();
    if (opts.verbose) {
      setVerbose(true);
    }
    if (opts.yes) {
      setAutoConfirm(true);
    }
    if (
      !opts.disableAutoUpdate &&
      !actionCommand.optsWithGlobals().json &&
      actionCommand.name() !== 'self-update' &&
      // status reports the version itself
      actionCommand.name() !== 'status'
    ) {
      await checkForUpdates();
    }
  });

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(statusCommand);
program.addCommand(feedbackCommand);
program.addCommand(appCommand);
program.addCommand(selfUpdateCommand);
program.addCommand(configCommand);
program.addCommand(projectCommand);

// Redirect `teams new` → `teams project new`
const newRedirect = new Command('new')
  .description('Create a new project (see: teams project new)')
  .argument('[args...]')
  .allowUnknownOption()
  .action(() => {
    logger.info(`Did you mean ${pc.cyan('teams project new')}?`);
    logger.info(`Run ${pc.cyan('teams project new --help')} for usage.`);
  });
program.addCommand(newRedirect);

function overrideExits(command: Command): void {
  command.exitOverride();
  for (const child of command.commands) overrideExits(child);
}

setTelemetry(await startTelemetry({ version }));
overrideExits(program);
let outcome: Outcome = 'succeeded';
const disposeSignals = installTelemetrySignalHandlers(telemetry(), () => {
  outcome = 'cancelled';
});
try {
  if (!handleJsonHelp(program, version)) await program.parseAsync();
  if (process.exitCode) outcome = 'failed';
} catch (error) {
  stopSpinners();
  if (getCancellationSignal()?.aborted) {
    outcome = 'cancelled';
  } else if (error instanceof CommanderError) {
    process.exitCode = error.exitCode;
    if (error.exitCode !== 0) outcome = 'failed';
  } else {
    outcome = 'failed';
    logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
    if (error instanceof CliError && error.suggestion) logger.error(error.suggestion);
    process.exitCode = 1;
  }
} finally {
  await telemetry().close(outcome);
  disposeSignals();
}
