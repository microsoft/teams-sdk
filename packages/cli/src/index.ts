#!/usr/bin/env node
import { createRequire } from 'node:module';
import { program, Command } from 'commander';
import { loginCommand, logoutCommand } from './commands/auth/index.js';
import { statusCommand } from './commands/status.js';
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

// Safety net: catch CliError thrown from shared utilities in non-wrapped commands
process.on('unhandledRejection', (error) => {
  if (error instanceof CliError) {
    logger.error(pc.red(error.message));
    if (error.suggestion) logger.error(error.suggestion);
  } else {
    logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
  }
  process.exit(1);
});

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

// Teams brand purple (#7B83EB) via truecolor escape
function teamsColor(text: string): string {
  if (!process.stdout.isTTY) return text;
  return `\x1b[38;2;123;131;235m${text}\x1b[39m`;
}

program
  .name('teams')
  .description('CLI for managing Microsoft Teams apps')
  .addHelpText('beforeAll', `${pc.bold(teamsColor('Teams CLI'))} ${pc.bold(pc.yellow('[Beta]'))}\n`)
  .version(version)
  .option('-v, --verbose', '[OPTIONAL] Enable verbose logging')
  .option('-y, --yes', '[OPTIONAL] Auto-confirm prompts (for CI/agent use)')
  .helpOption('-h, --help', 'Display help (use with --json for structured output)')
  .addHelpText('after', () => {
    const status = isInteractive() ? pc.green('on') : pc.yellow('off');
    return `\nInteractive mode: ${status}\n  Set ${pc.cyan('TEAMS_NO_INTERACTIVE=1')} to disable, unset to enable.`;
  })
  .hook('preAction', async (thisCommand, actionCommand) => {
    const opts = thisCommand.optsWithGlobals();
    if (opts.verbose) {
      setVerbose(true);
    }
    if (opts.yes) {
      setAutoConfirm(true);
    }
    if (actionCommand.name() !== 'self-update') {
      await checkForUpdates();
    }
  });

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(statusCommand);
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

if (!handleJsonHelp(program, version)) {
  program.parse();
}
