import { Command } from 'commander';
import pc from 'picocolors';
import { wrapAction } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { listTemplates } from '../../../project/scaffold.js';
import {
  createProjectFromTemplate,
  normalizePackageName,
  resolveProjectName,
  type ProjectLanguageStrategy,
  type ProjectNewCommandOptions,
  type ProjectNewOutput,
} from '../shared.js';

interface ProjectNewPyOptions extends ProjectNewCommandOptions {}

const templates = listTemplates('python');

const pythonStrategy: ProjectLanguageStrategy = {
  language: 'python',
  displayName: 'Python',
  templates,
  normalizeProjectName: normalizePackageName,
  validateProjectName(): void {},
  mapBaseEnvVars(baseEnvVars: Record<string, string>): Record<string, string> {
    return baseEnvVars;
  },
  renderNextSteps(projectName: string): void {
    logger.info(pc.bold('Next steps to start the app:'));
    logger.info(pc.cyan(`  cd ${projectName}`));
    logger.info(pc.cyan('  python -m venv .venv'));
    logger.info(pc.dim('  # activate your venv, then:'));
    logger.info(pc.cyan('  pip install -e .'));
    logger.info(pc.cyan('  python src/main.py'));
  },
};

export async function createPythonProject(
  rawName: string,
  options: ProjectNewPyOptions
): Promise<ProjectNewOutput | undefined> {
  return createProjectFromTemplate(rawName, options, pythonStrategy);
}

export const projectNewPythonCommand = new Command('python')
  .alias('py')
  .description('Create a new Python Teams app')
  .argument('[name]', 'Project name')
  .option(`-t, --template <template>`, `App template (${templates.join(', ')})`, 'echo')
  .option('--client-id <id>', '[OPTIONAL] Azure app client ID')
  .option('--client-secret <secret>', '[OPTIONAL] Azure app client secret')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (rawName: string | undefined, options: ProjectNewPyOptions) => {
      const name = await resolveProjectName(rawName, options.json);
      await createPythonProject(name, options);
    })
  );
