import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';
import { wrapAction, CliError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { confirmAction } from '../../../utils/interactive.js';
import { outputJson } from '../../../utils/json-output.js';
import { scaffoldProject, listTemplates } from '../../../project/scaffold.js';
import { normalizePackageName, gatherEnvVars, type ProjectNewOutput } from '../shared.js';

interface ProjectNewPyOptions {
  template: string;
  clientId?: string;
  clientSecret?: string;
  json?: boolean;
}

const templates = listTemplates('python');

export const projectNewPythonCommand = new Command('python')
  .alias('py')
  .description('Create a new Python Teams app')
  .argument('<name>', 'App name')
  .option(`-t, --template <template>`, `App template (${templates.join(', ')})`, 'echo')
  .option('--client-id <id>', '[OPTIONAL] Azure app client ID')
  .option('--client-secret <secret>', '[OPTIONAL] Azure app client secret')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (rawName: string, options: ProjectNewPyOptions) => {
      const name = normalizePackageName(rawName);

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
        `Create Python app "${name}" using ${options.template} template?`,
        options.json
      );
      if (!confirmed) return;

      const envVars = gatherEnvVars(options);

      await scaffoldProject({
        name,
        language: 'python',
        template: options.template,
        targetDir,
        envVars: Object.keys(envVars).length > 0 ? envVars : undefined,
      });

      if (options.json) {
        const output: ProjectNewOutput = {
          name,
          language: 'python',
          template: options.template,
          path: targetDir,
        };
        outputJson(output);
        return;
      }

      logger.info(pc.bold(pc.green(`App "${name}" created successfully at ${targetDir}`)));

      logger.info(pc.bold('Next steps to start the app:'));
      logger.info(pc.cyan(`  cd ${name}`));
      logger.info(pc.cyan('  python -m venv .venv'));
      logger.info(pc.dim('  # activate your venv, then:'));
      logger.info(pc.cyan('  pip install -e .'));
      logger.info(pc.cyan('  python src/main.py'));
    })
  );
