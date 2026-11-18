import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { paths } from '../auth/config.js';
import { CliError } from './errors.js';

const CONFIG_FILE = join(paths.config, 'config.json');

export interface OrbitRegionConfig {
  homeAccountId: string;
  tenantId: string;
  environment: string;
  baseUrl: string;
}

interface Config {
  'default-bot-location'?: string;
  orbitRegion?: OrbitRegionConfig;
}

const KNOWN_KEYS: Record<string, { values: string[]; description: string }> = {
  'default-bot-location': {
    values: ['tm', 'azure'],
    description: 'Default bot location for app create (teams-managed or azure)',
  },
};

function isOrbitRegion(value: unknown): value is OrbitRegionConfig {
  return value !== null && typeof value === 'object'
    && 'homeAccountId' in value && typeof value.homeAccountId === 'string'
    && 'tenantId' in value && typeof value.tenantId === 'string'
    && 'environment' in value && typeof value.environment === 'string'
    && 'baseUrl' in value && typeof value.baseUrl === 'string';
}

function isConfig(value: unknown): value is Config {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (!('default-bot-location' in value) || typeof value['default-bot-location'] === 'string')
    && (!('orbitRegion' in value) || isOrbitRegion(value.orbitRegion));
}

async function readConfigFile(): Promise<Config> {
  let text: string;
  try {
    text = await readFile(CONFIG_FILE, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return {};
    throw error;
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new CliError('API_ERROR', 'CLI configuration contains invalid JSON.');
  }
  if (!isConfig(value)) {
    throw new CliError('API_ERROR', 'CLI configuration has an invalid format.');
  }
  return value;
}

async function writeConfigFile(config: Config): Promise<void> {
  await mkdir(paths.config, { recursive: true, mode: 0o700 });
  const temporaryFile = `${CONFIG_FILE}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryFile, JSON.stringify(config, null, 2), { mode: 0o600, flag: 'wx' });
    await rename(temporaryFile, CONFIG_FILE);
  } finally {
    await rm(temporaryFile, { force: true });
  }
}

export async function getConfig(key: string): Promise<string | undefined> {
  const config = await readConfigFile();
  return key === 'default-bot-location' ? config[key] : undefined;
}

export async function setConfig(key: string, value: string): Promise<void> {
  if (key !== 'default-bot-location') {
    throw new CliError('VALIDATION_FORMAT', `Unknown config key: ${key}.`);
  }
  const config = await readConfigFile();
  config[key] = value;
  await writeConfigFile(config);
}

export async function readOrbitRegion(): Promise<OrbitRegionConfig | undefined> {
  return (await readConfigFile()).orbitRegion;
}

export async function writeOrbitRegion(region: OrbitRegionConfig): Promise<void> {
  const config = await readConfigFile();
  config.orbitRegion = region;
  await writeConfigFile(config);
}

export async function clearOrbitRegion(): Promise<void> {
  const config = await readConfigFile();
  if (!config.orbitRegion) return;
  delete config.orbitRegion;
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
