import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import pc from 'picocolors';
import { getConfig, setConfig, validateConfig, KNOWN_KEYS } from '../../utils/config.js';
import { isInteractive } from '../../utils/interactive.js';
import { CliError, wrapAction } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { outputJson } from '../../utils/json-output.js';
import { displayValue } from './display.js';

interface ConfigSetOptions {
  json?: boolean;
}

interface ConfigSetOutput {
  key: string;
  value: string;
}

/** User-friendly aliases for stored values */
const ALIASES: Record<string, Record<string, string>> = {
  'default-bot-location': { 'teams-managed': 'tm' },
};

/** Interactive choice labels for each key */
const CHOICES: Record<string, { name: string; value: string }[]> = {
  'default-bot-location': [
    { name: 'Teams managed (no Azure subscription needed)', value: 'tm' },
    { name: 'Azure (requires az CLI + subscription)', value: 'azure' },
  ],
};

export const configSetCommand = new Command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Config key to set')
  .argument('[value]', 'Value to set. Omit to pick interactively.')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (key: string, value: string | undefined, options: ConfigSetOptions) => {
      if (!KNOWN_KEYS[key]) {
        const known = Object.keys(KNOWN_KEYS).join(', ');
        throw new CliError('VALIDATION_FORMAT', `Unknown config key: ${key}. Known keys: ${known}`);
      }

      if (!value && isInteractive()) {
        const current = await getConfig(key);
        const choices = CHOICES[key];
        if (choices) {
          value = await select({ message: key, choices, default: current });
        }
      }

      if (!value) {
        throw new CliError(
          'VALIDATION_MISSING',
          `Missing value for ${key}.`,
          `Valid values: ${KNOWN_KEYS[key].values.map((v) => displayValue(key, v)).join(', ')}`
        );
      }

      // Resolve aliases (e.g. "teams-managed" → "tm")
      const aliases = ALIASES[key];
      if (aliases && aliases[value]) {
        value = aliases[value];
      }

      const error = validateConfig(key, value);
      if (error) {
        throw new CliError('VALIDATION_FORMAT', error);
      }

      const current = await getConfig(key);
      if (value === current) {
        if (options.json) {
          outputJson({ key, value } satisfies ConfigSetOutput);
        } else {
          logger.info(pc.dim(`${key} is already ${displayValue(key, value)}`));
        }
        return;
      }

      await setConfig(key, value);

      if (options.json) {
        outputJson({ key, value } satisfies ConfigSetOutput);
      } else {
        logger.info(`${pc.dim(key)} = ${pc.bold(pc.green(displayValue(key, value)))}`);
      }
    })
  );
