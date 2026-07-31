import * as fs from 'node:fs';
import * as path from 'node:path';
import pc from 'picocolors';
import { CliError } from './errors.js';
import { logger } from './logger.js';

export interface EnvValues {
  CLIENT_ID: string;
  CLIENT_SECRET?: string;
  TENANT_ID: string;
}

/** Ensure the parent directory of a file path exists before writing to it. */
function ensureParentDir(resolvedPath: string): void {
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
}

const BOM = '\uFEFF';

/**
 * Read a JSON object from disk, tolerating a UTF-8 BOM. Visual Studio writes
 * appsettings.json / launchSettings.json with a BOM, which JSON.parse rejects.
 * Returns an empty object when the file does not exist, plus whether a BOM was
 * present so it can be preserved on write.
 */
function readJsonObjectFile(
  resolvedPath: string,
  filePath: string
): { json: Record<string, unknown>; hadBom: boolean } {
  if (!fs.existsSync(resolvedPath)) {
    return { json: {}, hadBom: false };
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const hadBom = raw.startsWith(BOM);
  const content = hadBom ? raw.slice(BOM.length) : raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new CliError('VALIDATION_FORMAT', `Invalid JSON in ${filePath}.`, 'Fix the JSON syntax and try again.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new CliError(
      'VALIDATION_FORMAT',
      `Expected a JSON object in ${filePath}, got ${Array.isArray(parsed) ? 'array' : typeof parsed}.`,
      'The file must contain a top-level JSON object (e.g. {}).'
    );
  }

  return { json: parsed as Record<string, unknown>, hadBom };
}

/** Write a JSON object to disk, re-adding the BOM when the original had one. */
function writeJsonObjectFile(resolvedPath: string, json: Record<string, unknown>, hadBom: boolean): void {
  ensureParentDir(resolvedPath);
  const content = JSON.stringify(json, null, 2) + '\n';
  fs.writeFileSync(resolvedPath, hadBom ? BOM + content : content);
}

export function writeEnvFile(filePath: string, values: EnvValues): void {
  const resolvedPath = path.resolve(filePath);

  let content = '';
  if (fs.existsSync(resolvedPath)) {
    content = fs.readFileSync(resolvedPath, 'utf-8');
  }

  const lines = content.split('\n');
  const existing = new Map<string, number>();

  lines.forEach((line, i) => {
    const match = line.match(/^([A-Z_]+)=/);
    if (match) {
      existing.set(match[1], i);
    }
  });

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const line = `${key}=${value}`;
    if (existing.has(key)) {
      lines[existing.get(key)!] = line;
    } else {
      lines.push(line);
    }
  }

  // Drop a stale secret so --no-secret never leaves an old CLIENT_SECRET behind.
  if (values.CLIENT_SECRET === undefined && existing.has('CLIENT_SECRET')) {
    lines.splice(existing.get('CLIENT_SECRET')!, 1);
  }

  ensureParentDir(resolvedPath);
  fs.writeFileSync(resolvedPath, lines.join('\n').trim() + '\n');
}

export function writeJsonCredentials(filePath: string, values: EnvValues): void {
  const resolvedPath = path.resolve(filePath);
  const { json, hadBom } = readJsonObjectFile(resolvedPath, filePath);

  const existing = { ...((json.Teams as Record<string, unknown>) ?? {}) };
  // Drop a stale secret so --no-secret never leaves an old ClientSecret behind.
  delete existing.ClientSecret;
  json.Teams = {
    ...existing,
    ClientId: values.CLIENT_ID,
    ...(values.CLIENT_SECRET !== undefined && { ClientSecret: values.CLIENT_SECRET }),
    TenantId: values.TENANT_ID,
  };

  writeJsonObjectFile(resolvedPath, json, hadBom);
}

export function isJsonFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.json';
}

export function isLaunchSettingsFile(filePath: string): boolean {
  return path.basename(filePath).toLowerCase() === 'launchsettings.json';
}

/**
 * Write credentials into a .NET launchSettings.json file as environment
 * variables on the first profile. Uses the legacy double-underscore keys
 * (Teams__ClientId, Teams__ClientSecret, Teams__TenantId) so ASP.NET
 * configuration binds them to the Teams settings section.
 */
export function writeLaunchSettingsCredentials(filePath: string, values: EnvValues): void {
  const resolvedPath = path.resolve(filePath);
  const { json, hadBom } = readJsonObjectFile(resolvedPath, filePath);

  let profiles = json.profiles as Record<string, unknown> | undefined;
  if (
    !profiles ||
    typeof profiles !== 'object' ||
    Array.isArray(profiles) ||
    Object.keys(profiles).length === 0
  ) {
    profiles = { http: { commandName: 'Project', environmentVariables: {} } };
    json.profiles = profiles;
  }

  const firstKey = Object.keys(profiles)[0]!;
  let profile = profiles[firstKey];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    profile = {};
    profiles[firstKey] = profile;
  }
  const profileObj = profile as Record<string, unknown>;

  let envVars = profileObj.environmentVariables;
  if (!envVars || typeof envVars !== 'object' || Array.isArray(envVars)) {
    envVars = {};
    profileObj.environmentVariables = envVars;
  }
  const envVarsObj = envVars as Record<string, unknown>;

  envVarsObj['Teams__ClientId'] = values.CLIENT_ID;
  if (values.CLIENT_SECRET !== undefined) {
    envVarsObj['Teams__ClientSecret'] = values.CLIENT_SECRET;
  } else {
    // Drop a stale secret so --no-secret never leaves an old ClientSecret behind.
    delete envVarsObj['Teams__ClientSecret'];
  }
  envVarsObj['Teams__TenantId'] = values.TENANT_ID;

  writeJsonObjectFile(resolvedPath, json, hadBom);
}

/**
 * Write credentials to a file, dispatching on the file type:
 * launchSettings.json → profile env vars, other .json → Teams section, else .env.
 */
export function writeCredentials(filePath: string, values: EnvValues): void {
  if (isLaunchSettingsFile(filePath)) {
    writeLaunchSettingsCredentials(filePath, values);
  } else if (isJsonFile(filePath)) {
    writeJsonCredentials(filePath, values);
  } else {
    writeEnvFile(filePath, values);
  }
}

export function outputCredentials(
  envPath: string | undefined,
  values: EnvValues,
  successMessage: string
): void {
  if (envPath) {
    writeCredentials(envPath, values);
    logger.info(pc.bold(pc.green(`Credentials written to ${envPath}`)));
  } else {
    logger.info(pc.bold(pc.green(`\n${successMessage}`)));
    logger.info(`\n${pc.dim('CLIENT_ID=')}${values.CLIENT_ID}`);
    if (values.CLIENT_SECRET !== undefined) {
      logger.info(`${pc.dim('CLIENT_SECRET=')}${values.CLIENT_SECRET}`);
    }
    logger.info(`${pc.dim('TENANT_ID=')}${values.TENANT_ID}`);

    if (values.CLIENT_SECRET !== undefined) {
      logger.warn("Save the client secret - it won't be shown again!");
    }
  }
}
