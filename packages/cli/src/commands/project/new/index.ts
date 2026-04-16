import { Command } from 'commander';
import { select, input } from '@inquirer/prompts';
import { isInteractive } from '../../../utils/interactive.js';
import { listTemplates, type ProjectLanguage } from '../../../project/scaffold.js';
import { projectNewTypescriptCommand } from './typescript.js';
import { projectNewCsharpCommand } from './csharp.js';
import { projectNewPythonCommand } from './python.js';

export const projectNewCommand = new Command('new')
  .description('Create a new Teams app project')
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    while (true) {
      try {
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

        const name = await input({ message: 'App name:' });
        if (!name.trim()) continue;

        const templates = listTemplates(language);
        const template =
          templates.length > 1
            ? await select({
                message: 'Select template',
                choices: templates.map((t) => ({ name: t, value: t })),
                default: 'echo',
              })
            : (templates[0] ?? 'echo');

        const args = [name, '--template', template];

        const cmd =
          language === 'typescript'
            ? projectNewTypescriptCommand
            : language === 'csharp'
              ? projectNewCsharpCommand
              : projectNewPythonCommand;

        await cmd.parseAsync(args, { from: 'user' });
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
