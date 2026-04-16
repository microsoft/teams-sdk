import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { paths } from '../auth/config.js';

const CONFIG_FILE = join(paths.config, 'config.json');

type Config = Record<string, string>;

const KNOWN_KEYS: Record<string, { values: string[]; description: string }> = {
  'default-bot-location': {
    values: ['tm', 'azure'],
    description: 'Default bot location for app create (teams-managed or azure)',
  },
  language: {
    values: ['typescript', 'csharp', 'python'],
    description: 'Default language for project creation',
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
  if (!spec.values.includes(value))
    return `Invalid value for ${key}. Must be one of: ${spec.values.join(', ')}`;
  return undefined;
}

export { KNOWN_KEYS };
