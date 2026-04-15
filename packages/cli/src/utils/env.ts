import * as fs from 'node:fs';
import * as path from 'node:path';
import { createSpinner } from 'nanospinner';
import pc from 'picocolors';
import { logger } from './logger.js';

export interface EnvValues {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
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

export function outputCredentials(
  envPath: string | undefined,
  values: EnvValues,
  successMessage: string
): void {
  if (envPath) {
    const spinner = createSpinner('Writing .env file...').start();
    writeEnvFile(envPath, values);
    spinner.success({ text: `Credentials written to ${envPath}` });

    logger.info(pc.bold(pc.green(`\n${successMessage}`)));
    logger.info(`Credentials written to ${pc.cyan(envPath)}`);
  } else {
    logger.info(pc.bold(pc.green(`\n${successMessage}`)));
    logger.info(`\n${pc.dim('CLIENT_ID=')}${values.CLIENT_ID}`);
    logger.info(`${pc.dim('CLIENT_SECRET=')}${values.CLIENT_SECRET}`);
    logger.info(`${pc.dim('TENANT_ID=')}${values.TENANT_ID}`);

    logger.warn("Save the client secret - it won't be shown again!");
  }
}
