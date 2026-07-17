import path from 'node:path';
import cp from 'node:child_process';
import { Command } from 'commander';
import { pascalCase } from 'change-case';
import { wrapAction } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { listTemplates } from '../../../project/scaffold.js';
import {
  createProjectFromTemplate,
  resolveProjectName,
  type ProjectLanguageStrategy,
  type ProjectNewCommandOptions,
  type ProjectNewOutput,
} from '../shared.js';

interface ProjectNewCsOptions extends ProjectNewCommandOptions {}

const templates = listTemplates('csharp');

const csharpStrategy: ProjectLanguageStrategy = {
  language: 'csharp',
  displayName: 'C#',
  templates,
  normalizeProjectName(rawName: string): string {
    return pascalCase(rawName.trim());
  },
  validateProjectName(): void {},
  mapBaseEnvVars(baseEnvVars: Record<string, string>): Record<string, string> {
    const envVars: Record<string, string> = {};
    if (baseEnvVars.CLIENT_ID) envVars['AzureAd.ClientId'] = baseEnvVars.CLIENT_ID;
    if (baseEnvVars.TENANT_ID) envVars['AzureAd.TenantId'] = baseEnvVars.TENANT_ID;
    if (baseEnvVars.CLIENT_SECRET) {
      envVars['AzureAd.ClientCredentials.0.SourceType'] = 'ClientSecret';
      envVars['AzureAd.ClientCredentials.0.ClientSecret'] = baseEnvVars.CLIENT_SECRET;
    }
    if (baseEnvVars.OPENAI_API_KEY) envVars.OPENAI_API_KEY = baseEnvVars.OPENAI_API_KEY;
    if (baseEnvVars.AZURE_OPENAI_API_KEY)
      envVars.AZURE_OPENAI_API_KEY = baseEnvVars.AZURE_OPENAI_API_KEY;
    if (baseEnvVars.AZURE_OPENAI_ENDPOINT)
      envVars.AZURE_OPENAI_ENDPOINT = baseEnvVars.AZURE_OPENAI_ENDPOINT;
    return envVars;
  },
  renderNextSteps(projectName: string): void {
    logger.info('Next steps to start the app:');
    logger.info(`cd ${projectName}/${projectName} && dotnet run`);
  },
  startProject(targetDir: string, projectName: string): void {
    logger.info(`cd ${projectName}/${projectName} && dotnet run`);
    cp.spawnSync('dotnet', ['run'], {
      cwd: path.join(targetDir, projectName),
      stdio: 'inherit',
    });
  },
};

export async function createCsharpProject(
  rawName: string,
  options: ProjectNewCsOptions
): Promise<ProjectNewOutput | undefined> {
  return createProjectFromTemplate(rawName, options, csharpStrategy);
}

export const projectNewCsharpCommand = new Command('csharp')
  .alias('cs')
  .description('Create a new C# Teams app')
  .argument('[name]', 'Project name (converted to PascalCase)')
  .option(`-t, --template <template>`, `App template (${templates.join(', ')})`, 'echo')
  .option('--client-id <id>', '[OPTIONAL] Azure app client ID')
  .option('--client-secret <secret>', '[OPTIONAL] Azure app client secret')
  .option('--tenant-id <id>', '[OPTIONAL] Azure tenant ID')
  .option('-s, --start', '[OPTIONAL] Auto-start project after creation')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (rawName: string | undefined, options: ProjectNewCsOptions) => {
      const name = await resolveProjectName(rawName, options.json);
      await createCsharpProject(name, options);
    })
  );
