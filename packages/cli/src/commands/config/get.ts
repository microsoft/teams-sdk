import { Command } from 'commander';
import pc from 'picocolors';
import { getConfig, KNOWN_KEYS } from '../../utils/config.js';
import { CliError, wrapAction } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { outputJson } from '../../utils/json-output.js';
import { displayValue } from './display.js';

interface ConfigGetOptions {
  json?: boolean;
}

interface ConfigGetOutput {
  values: Record<string, string | null>;
}

export const configGetCommand = new Command('get')
  .description('Show configuration values')
  .argument('[key]', 'Config key to read. Omit to show all values.')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (key: string | undefined, options: ConfigGetOptions) => {
      if (key) {
        if (!KNOWN_KEYS[key]) {
          const known = Object.keys(KNOWN_KEYS).join(', ');
          throw new CliError('VALIDATION_FORMAT', `Unknown config key: ${key}. Known keys: ${known}`);
        }

        const raw = await getConfig(key);

        if (options.json) {
          outputJson({ values: { [key]: raw ?? null } } satisfies ConfigGetOutput);
        } else {
          logger.info(raw ? displayValue(key, raw) : pc.dim('not set'));
        }
        return;
      }

      // Show all values
      const values: Record<string, string | null> = {};
      for (const k of Object.keys(KNOWN_KEYS)) {
        values[k] = (await getConfig(k)) ?? null;
      }

      if (options.json) {
        outputJson({ values } satisfies ConfigGetOutput);
      } else {
        for (const [k, v] of Object.entries(values)) {
          logger.info(`${pc.dim(k)} = ${v ? pc.bold(pc.green(displayValue(k, v))) : pc.dim('not set')}`);
        }
      }
    })
  );
