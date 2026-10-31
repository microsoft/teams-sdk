import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { paths } from '../auth/config.js';

const CONFIG_FILE = join(paths.config, 'config.json');

type Config = Record<string, string>;

interface ConfigKeySpec {
  /** Fixed set of valid values (enum-style key). Mutually exclusive with `validate`. */
  values?: string[];
  /** Format validator for free-form keys (e.g. a country code or SKU ID). Returns an error message if invalid. */
  validate?: (value: string) => string | undefined;
  description: string;
}

const USAGE_LOCATION_PATTERN = /^[A-Za-z]{2}$/;

const KNOWN_KEYS: Record<string, ConfigKeySpec> = {
  'default-bot-location': {
    values: ['tm', 'azure'],
    description: 'Default bot location for app create (teams-managed or azure)',
  },
  'agent-default-usage-location': {
    validate: (value) =>
      USAGE_LOCATION_PATTERN.test(value) ? undefined : 'Expected a two-letter country code (e.g. US)',
    description:
      'Default two-letter usage-location country code applied to new agentic users when --usage-location is omitted',
  },
  'agent-default-license': {
    validate: (value) => (value.trim() ? undefined : 'License SKU ID or part number cannot be empty'),
    description: 'Default license SKU ID or part number assigned to new agentic users when --license is omitted',
  },
  'agent-default-permissions': {
    validate: (value) => (value.trim() ? undefined : 'Must be a comma-separated list of Graph scopes'),
    description:
      'Default comma-separated Microsoft Graph delegated scopes (e.g. Mail.ReadWrite,Chat.ReadWrite) granted on new blueprints when --permissions is omitted',
  },
};

async function readConfigFile(): Promise<Config> {
  try {
    const data = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeConfigFile(config: Config): Promise<void> {
  await mkdir(paths.config, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function getConfig(key: string): Promise<string | undefined> {
  const config = await readConfigFile();
  return config[key];
}

export async function setConfig(key: string, value: string): Promise<void> {
  const config = await readConfigFile();
  config[key] = value;
  await writeConfigFile(config);
}

/**
 * Validate a config key/value pair. Returns an error message if invalid, undefined if valid.
 */
export function validateConfig(key: string, value: string): string | undefined {
  const spec = KNOWN_KEYS[key];
  if (!spec) return `Unknown config key: ${key}. Known keys: ${Object.keys(KNOWN_KEYS).join(', ')}`;
  if (spec.values) {
    return spec.values.includes(value) ? undefined : `Invalid value for ${key}. Must be one of: ${spec.values.join(', ')}`;
  }
  return spec.validate?.(value);
}

export { KNOWN_KEYS };
