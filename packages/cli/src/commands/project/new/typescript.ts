import cp from 'node:child_process';
import { Command } from 'commander';
import { wrapAction, CliError } from '../../../utils/errors.js';
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

interface ProjectNewTsOptions extends ProjectNewCommandOptions {}

const templates = listTemplates('typescript');

const typescriptStrategy: ProjectLanguageStrategy = {
  language: 'typescript',
  displayName: 'TypeScript',
  templates,
  normalizeProjectName: normalizePackageName,
  validateProjectName(projectName: string): void {
    if (!/^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName)) {
      throw new CliError('VALIDATION_FORMAT', `"${projectName}" is not a valid package name.`);
    }
  },
  mapBaseEnvVars(baseEnvVars: Record<string, string>): Record<string, string> {
    return baseEnvVars;
  },
  renderNextSteps(projectName: string): void {
    logger.info('Next steps to start the app:');
    logger.info(`cd ${projectName} && npm install && npm run dev`);
  },
  startProject(targetDir: string, projectName: string): void {
    logger.info(`cd ${projectName} && npm install && npm run dev`);
    cp.spawnSync('npm', ['install'], { cwd: targetDir, stdio: 'inherit' });
    cp.spawnSync('npm', ['run', 'dev'], { cwd: targetDir, stdio: 'inherit' });
  },
};

export async function createTypescriptProject(
  rawName: string,
  options: ProjectNewTsOptions
): Promise<ProjectNewOutput | undefined> {
  return createProjectFromTemplate(rawName, options, typescriptStrategy);
}

export const projectNewTypescriptCommand = new Command('typescript')
  .alias('ts')
  .description('Create a new TypeScript Teams app')
  .argument('[name]', 'Project name')
  .option(`-t, --template <template>`, `App template (${templates.join(', ')})`, 'echo')
  .option('--client-id <id>', '[OPTIONAL] Azure app client ID')
  .option('--client-secret <secret>', '[OPTIONAL] Azure app client secret')
  .option('-s, --start', '[OPTIONAL] Auto-start project after creation')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (rawName: string | undefined, options: ProjectNewTsOptions) => {
      const name = await resolveProjectName(rawName, options.json);
      await createTypescriptProject(name, options);
    })
  );
