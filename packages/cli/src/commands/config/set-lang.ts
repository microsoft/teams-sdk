import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import pc from 'picocolors';
import { getConfig, setConfig } from '../../utils/config.js';
import { isInteractive } from '../../utils/interactive.js';
import { CliError, wrapAction } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { outputJson } from '../../utils/json-output.js';

interface SetLangOptions {
  json?: boolean;
}

interface SetLangOutput {
  language: string | null;
}

const LANGUAGES = ['typescript', 'csharp', 'python'] as const;
const ALIASES: Record<string, string> = {
  ts: 'typescript',
  cs: 'csharp',
  py: 'python',
};

export const setLangCommand = new Command('set-lang')
  .description('Default language for project creation (typescript, csharp, python)')
  .argument(
    '[language]',
    'Set to typescript (ts), csharp (cs), or python (py). Omit to show current value or pick interactively.'
  )
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (value: string | undefined, options: SetLangOptions) => {
      const current = await getConfig('language');

      if (!value && !options.json && isInteractive()) {
        value = await select({
          message: 'Default language',
          choices: [
            { name: 'TypeScript', value: 'typescript' },
            { name: 'C#', value: 'csharp' },
            { name: 'Python', value: 'python' },
          ],
          default: current ?? 'typescript',
        });
      }

      if (!value) {
        if (options.json) {
          outputJson({ language: current ?? null } satisfies SetLangOutput);
        } else {
          logger.info(current ?? pc.dim('not set'));
        }
        return;
      }

      // Resolve aliases
      const resolved = ALIASES[value] ?? value;

      if (!(LANGUAGES as readonly string[]).includes(resolved)) {
        throw new CliError(
          'VALIDATION_FORMAT',
          `Invalid language: ${value}. Must be one of: ${LANGUAGES.join(', ')} (or ts, cs, py).`
        );
      }

      if (resolved === current) {
        if (options.json) {
          outputJson({ language: resolved } satisfies SetLangOutput);
        } else {
          logger.info(pc.dim(`language is already ${resolved}`));
        }
        return;
      }

      await setConfig('language', resolved);

      if (options.json) {
        outputJson({ language: resolved } satisfies SetLangOutput);
      } else {
        logger.info(`${pc.dim('language')} = ${pc.bold(pc.green(resolved))}`);
      }
    })
  );
