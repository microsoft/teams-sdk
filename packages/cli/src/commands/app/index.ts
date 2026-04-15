import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { appListCommand } from './list.js';
import { appCreateCommand } from './create.js';
import { appGetCommand } from './get.js';
import { appUpdateCommand } from './update.js';
import { appPackageCommand } from './package/index.js';
import { appManifestCommand } from './manifest/index.js';
import { authCommand } from './auth/index.js';
import { botCommand } from './bot/index.js';
import { rscCommand } from './rsc/index.js';
import { appDoctorCommand } from './doctor.js';
import { isInteractive } from '../../utils/interactive.js';
import { pickApp } from '../../utils/app-picker.js';
import { fetchApp } from '../../apps/index.js';
import { showAppActions } from './actions.js';

export const appCommand = new Command('app')
  .description('Manage Teams apps')
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    while (true) {
      try {
        const action = await select({
          message: 'What would you like to do?',
          choices: [
            { name: 'Select app', value: 'select' },
            { name: 'Create app', value: 'create' },
            { name: 'Exit', value: 'exit' },
          ],
        });

        if (action === 'exit') return;

        if (action === 'select') {
          const picked = await pickApp();
          const app = await fetchApp(picked.token, picked.app.teamsAppId);
          await showAppActions(app, picked.token);
        } else if (action === 'create') {
          await appCreateCommand.parseAsync([], { from: 'user' });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') {
          return;
        }
        throw error;
      }
    }
  });

appCommand.addCommand(appListCommand);
appCommand.addCommand(appCreateCommand);
appCommand.addCommand(appGetCommand);
appCommand.addCommand(appUpdateCommand);
appCommand.addCommand(appPackageCommand);
appCommand.addCommand(appManifestCommand);
appCommand.addCommand(authCommand);
appCommand.addCommand(botCommand);
appCommand.addCommand(rscCommand);
appCommand.addCommand(appDoctorCommand);
