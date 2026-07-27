import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { isInteractive } from '../../../utils/interactive.js';
import { listTemplates, type ProjectLanguage } from '../../../project/scaffold.js';
import { resolveProjectName } from '../shared.js';
import { createTypescriptProject, projectNewTypescriptCommand } from './typescript.js';
import { createCsharpProject, projectNewCsharpCommand } from './csharp.js';
import { createPythonProject, projectNewPythonCommand } from './python.js';

export const projectNewCommand = new Command('new')
  .description('Create a new Teams app project')
  .addHelpText(
    'after',
    '\nAfter creating a project, provision app credentials with:\n  teams app create --name "<app name>" --env <project credentials file>\n'
  )
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    while (true) {
      try {
        const initialName = await resolveProjectName(undefined);
        const language = await select({
          message: 'Select language',
          choices: [
            { name: 'TypeScript', value: 'typescript' as ProjectLanguage },
            { name: 'C#', value: 'csharp' as ProjectLanguage },
            { name: 'Python', value: 'python' as ProjectLanguage },
            { name: 'Back', value: 'back' as const },
          ],
        });

        if (language === 'back') return;

        const templates = listTemplates(language);
        const template =
          templates.length > 1
            ? await select({
                message: 'Select template',
                choices: templates.map((t) => ({ name: t, value: t })),
                default: 'echo',
              })
            : (templates[0] ?? 'echo');

        if (language === 'typescript') {
          await createTypescriptProject(initialName, { template });
        } else if (language === 'csharp') {
          await createCsharpProject(initialName, { template });
        } else {
          await createPythonProject(initialName, { template });
        }
        return; // Exit after project creation
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') return;
        throw error;
      }
    }
  });

projectNewCommand.addCommand(projectNewTypescriptCommand);
projectNewCommand.addCommand(projectNewCsharpCommand);
projectNewCommand.addCommand(projectNewPythonCommand);
