import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { Command } from 'commander';
import pc from 'picocolors';
import { pascalCase } from 'change-case';
import { wrapAction, CliError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { confirmAction } from '../../../utils/interactive.js';
import { outputJson } from '../../../utils/json-output.js';
import { scaffoldProject, listTemplates } from '../../../project/scaffold.js';
import { gatherEnvVars, type ProjectNewOutput } from '../shared.js';

interface ProjectNewCsOptions {
  template: string;
  clientId?: string;
  clientSecret?: string;
  start?: boolean;
  json?: boolean;
}

const templates = listTemplates('csharp');

export const projectNewCsharpCommand = new Command('csharp')
  .alias('cs')
  .description('Create a new C# Teams app')
  .argument('<name>', 'App name (converted to PascalCase)')
  .option(`-t, --template <template>`, `App template (${templates.join(', ')})`, 'echo')
  .option('--client-id <id>', '[OPTIONAL] Azure app client ID')
  .option('--client-secret <secret>', '[OPTIONAL] Azure app client secret')
  .option('-s, --start', '[OPTIONAL] Auto-start project after creation')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (rawName: string, options: ProjectNewCsOptions) => {
      const name = pascalCase(rawName.trim(), { delimiter: '.' });

      if (!templates.includes(options.template)) {
        throw new CliError(
          'VALIDATION_FORMAT',
          `Unknown template "${options.template}".`,
          `Available templates: ${templates.join(', ')}`
        );
      }

      const targetDir = path.join(process.cwd(), name);
      if (fs.existsSync(targetDir)) {
        throw new CliError('VALIDATION_CONFLICT', `"${name}" already exists.`);
      }

      const confirmed = await confirmAction(
        `Create C# app "${name}" using ${options.template} template?`,
        options.json
      );
      if (!confirmed) return;

      // C# uses different env var key conventions
      const baseEnvVars = gatherEnvVars(options);
      const envVars: Record<string, string> = {};
      if (baseEnvVars.CLIENT_ID) envVars['Teams.ClientId'] = baseEnvVars.CLIENT_ID;
      if (baseEnvVars.CLIENT_SECRET) envVars['Teams.ClientSecret'] = baseEnvVars.CLIENT_SECRET;
      if (baseEnvVars.OPENAI_API_KEY) envVars.OPENAI_API_KEY = baseEnvVars.OPENAI_API_KEY;
      if (baseEnvVars.AZURE_OPENAI_API_KEY)
        envVars.AZURE_OPENAI_API_KEY = baseEnvVars.AZURE_OPENAI_API_KEY;
      if (baseEnvVars.AZURE_OPENAI_ENDPOINT)
        envVars.AZURE_OPENAI_ENDPOINT = baseEnvVars.AZURE_OPENAI_ENDPOINT;

      await scaffoldProject({
        name,
        language: 'csharp',
        template: options.template,
        targetDir,
        envVars: Object.keys(envVars).length > 0 ? envVars : undefined,
      });

      if (options.json) {
        const output: ProjectNewOutput = {
          name,
          language: 'csharp',
          template: options.template,
          path: targetDir,
        };
        outputJson(output);
        return;
      }

      logger.info(pc.bold(pc.green(`App "${name}" created successfully at ${targetDir}`)));

      if (options.start) {
        logger.info(`cd ${name}/${name} && dotnet run`);
        cp.spawnSync('dotnet', ['run'], {
          cwd: path.join(targetDir, name),
          stdio: 'inherit',
        });
      } else {
        logger.info('Next steps to start the app:');
        logger.info(`cd ${name}/${name} && dotnet run`);
      }
    })
  );
