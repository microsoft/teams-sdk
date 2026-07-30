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

  fs.writeFileSync(resolvedPath, lines.join('\n').trim() + '\n');
}

export function writeJsonCredentials(filePath: string, values: EnvValues): void {
  const resolvedPath = path.resolve(filePath);

  let json: Record<string, unknown> = {};
  if (fs.existsSync(resolvedPath)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
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
    json = parsed as Record<string, unknown>;
  }

  const existing = (json.Teams as Record<string, unknown>) ?? {};
  json.Teams = {
    ...existing,
    ClientId: values.CLIENT_ID,
    ...(values.CLIENT_SECRET !== undefined && { ClientSecret: values.CLIENT_SECRET }),
    TenantId: values.TENANT_ID,
  };

  fs.writeFileSync(resolvedPath, JSON.stringify(json, null, 2) + '\n');
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

  let json: Record<string, unknown> = {};
  if (fs.existsSync(resolvedPath)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
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
    json = parsed as Record<string, unknown>;
  }

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
  }
  envVarsObj['Teams__TenantId'] = values.TENANT_ID;

  fs.writeFileSync(resolvedPath, JSON.stringify(json, null, 2) + '\n');
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
