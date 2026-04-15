import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { isInteractive } from '../../utils/interactive.js';
import { projectNewCommand } from './new/index.js';

export const projectCommand = new Command('project')
  .description('Create and configure Teams app projects')
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    while (true) {
      try {
        const action = await select({
          message: 'Project',
          choices: [
            { name: 'New project', value: 'new' },
            { name: 'Back', value: 'back' },
          ],
        });

        if (action === 'back') return;

        if (action === 'new') {
          await projectNewCommand.parseAsync([], { from: 'user' });
          return; // Exit after project creation
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') return;
        throw error;
      }
    }
  });

projectCommand.addCommand(projectNewCommand);
