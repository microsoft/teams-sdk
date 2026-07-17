import fs from 'node:fs';
import path from 'node:path';
import { confirm, input } from '@inquirer/prompts';
import pc from 'picocolors';
import { CliError } from '../../utils/errors.js';
import { outputJson } from '../../utils/json-output.js';
import { logger } from '../../utils/logger.js';
import { confirmAction, isAutoConfirm, isInteractive } from '../../utils/interactive.js';
import {
  scaffoldProject,
  type ProjectLanguage,
  type ScaffoldOptions,
} from '../../project/scaffold.js';
import { runAppCreate, type AppCreateOutput } from '../app/create.js';

export interface ProjectNewOutput {
  name: string;
  language: string;
  template: string;
  path: string;
  credentialsFile?: string;
  appCreateCommand?: string;
  teamsAppId?: string;
  botId?: string;
}

export interface ProjectNewCommandOptions {
  template: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  start?: boolean;
  json?: boolean;
}

export interface ProjectLanguageStrategy {
  language: ProjectLanguage;
  displayName: string;
  templates: string[];
  normalizeProjectName(rawName: string): string;
  validateProjectName(projectName: string): void;
  mapBaseEnvVars(baseEnvVars: Record<string, string>): Record<string, string>;
  renderNextSteps(projectName: string): void;
  startProject?: (targetDir: string, projectName: string) => void;
}

/**
 * Normalize a package/project name for TypeScript or Python.
 */
export function normalizePackageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-');
}

/**
 * Gather environment variables from CLI options and process.env.
 */
export function gatherEnvVars(opts: {
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
}): Record<string, string> {
  const envVars: Record<string, string> = {};
  const clientId = opts.clientId ?? process.env.CLIENT_ID;
  const clientSecret = opts.clientSecret ?? process.env.CLIENT_SECRET;
  const tenantId = opts.tenantId ?? process.env.TENANT_ID;
  if (clientId) envVars.CLIENT_ID = clientId;
  if (clientSecret) envVars.CLIENT_SECRET = clientSecret;
  if (tenantId) envVars.TENANT_ID = tenantId;
  if (process.env.OPENAI_API_KEY) envVars.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (process.env.AZURE_OPENAI_API_KEY)
    envVars.AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
  if (process.env.AZURE_OPENAI_ENDPOINT)
    envVars.AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
  return envVars;
}

export function credentialFilePath(
  language: ProjectLanguage,
  targetDir: string,
  projectName: string
): string {
  if (language === 'csharp') {
    return path.join(targetDir, projectName, 'appsettings.Development.json');
  }
  return path.join(targetDir, '.env');
}

export function credentialDisplayPath(language: ProjectLanguage, projectName: string): string {
  if (language === 'csharp') {
    return path.join(projectName, projectName, 'appsettings.Development.json');
  }
  return path.join(projectName, '.env');
}

export function appCreateCommandFor(agentName: string, credentialsPath: string): string {
  return `teams app create --name ${quoteCommandArg(agentName)} --env ${quoteCommandArg(credentialsPath)}`;
}

export function hasCredentialValues(envVars: Record<string, string>): boolean {
  return Boolean(envVars.CLIENT_ID ?? envVars['Teams.ClientId']);
}

export async function resolveProjectName(
  rawName: string | undefined,
  json = false
): Promise<string> {
  if (rawName?.trim()) return rawName;
  if (json || !isInteractive()) {
    throw new CliError('VALIDATION_MISSING', 'Project name is required.');
  }
  const promptedName = await input({
    message: 'Project name:',
    validate: (value) => (value.trim() ? true : 'Project name cannot be empty.'),
  });
  return promptedName;
}

export async function createProjectFromTemplate(
  rawName: string,
  options: ProjectNewCommandOptions,
  strategy: ProjectLanguageStrategy
): Promise<ProjectNewOutput | undefined> {
  const name = strategy.normalizeProjectName(rawName);

  if (!strategy.templates.includes(options.template)) {
    throw new CliError(
      'VALIDATION_FORMAT',
      `Unknown template "${options.template}".`,
      `Available templates: ${strategy.templates.join(', ')}`
    );
  }

  strategy.validateProjectName(name);

  const targetDir = path.join(process.cwd(), name);
  if (fs.existsSync(targetDir)) {
    throw new CliError('VALIDATION_CONFLICT', `"${name}" already exists.`);
  }

  const confirmed = await confirmAction(
    `Create ${strategy.displayName} app "${name}" using ${options.template} template?`,
    options.json
  );
  if (!confirmed) return undefined;

  const credentialPath = credentialFilePath(strategy.language, targetDir, name);
  const credentialDisplay = credentialDisplayPath(strategy.language, name);
  const baseEnvVars = strategy.mapBaseEnvVars(gatherEnvVars(options));
  const envVars = { ...baseEnvVars };
  const hasCredentials = hasCredentialValues(envVars);

  await scaffoldProjectWithCleanup({
    name,
    language: strategy.language,
    template: options.template,
    targetDir,
    envVars: Object.keys(envVars).length > 0 ? envVars : undefined,
  });

  const output: ProjectNewOutput = {
    name,
    language: strategy.language,
    template: options.template,
    path: targetDir,
    ...(hasCredentials ? { credentialsFile: credentialPath } : {}),
    ...(!hasCredentials
      ? { appCreateCommand: appCreateCommandFor(rawName.trim(), credentialDisplay) }
      : {}),
  };

  if (options.json) {
    outputJson(output);
    return output;
  }

  logger.info(pc.bold(pc.green(`App "${name}" created successfully at ${targetDir}`)));

  let hasProjectCredentials = hasCredentials;
  if (!hasProjectCredentials) {
    const appCreateResult = await maybeProvisionAppForCreatedProject(
      rawName,
      options,
      credentialPath
    );
    if (appCreateResult) {
      output.credentialsFile = appCreateResult.credentialsFile ?? credentialPath;
      output.teamsAppId = appCreateResult.teamsAppId;
      output.botId = appCreateResult.botId;
      delete output.appCreateCommand;
      hasProjectCredentials = true;
    }
  }

  if (!hasProjectCredentials) {
    logger.info('');
    logger.info(pc.bold('To provision an app and write credentials:'));
    logger.info(pc.cyan(`  ${appCreateCommandFor(rawName.trim(), credentialDisplay)}`));
  }

  if (options.start && strategy.startProject) {
    strategy.startProject(targetDir, name);
  } else {
    strategy.renderNextSteps(name);
  }

  return output;
}

async function maybeProvisionAppForCreatedProject(
  rawName: string,
  options: ProjectNewCommandOptions,
  credentialPath: string
): Promise<AppCreateOutput | undefined> {
  if (options.json || !isInteractive() || isAutoConfirm() || hasExplicitCredentials(options)) {
    return undefined;
  }

  const provisionApp = await confirm({
    message: 'Provision an app now?',
    default: true,
  });
  if (!provisionApp) return undefined;
  return runAppCreate(
    { env: credentialPath },
    {
      defaultName: rawName.trim(),
      skipPostCreateActions: true,
    }
  );
}

export async function scaffoldProjectWithCleanup(opts: ScaffoldOptions): Promise<void> {
  const targetExisted = fs.existsSync(opts.targetDir);
  try {
    await scaffoldProject(opts);
  } catch (error) {
    if (!targetExisted && fs.existsSync(opts.targetDir)) {
      fs.rmSync(opts.targetDir, { recursive: true, force: true });
    }
    throw error;
  }
}

function quoteCommandArg(value: string): string {
  return JSON.stringify(value);
}

function hasExplicitCredentials(options: ProjectNewCommandOptions): boolean {
  return Boolean(
    options.clientId ??
      options.clientSecret ??
      options.tenantId ??
      process.env.CLIENT_ID ??
      process.env.CLIENT_SECRET ??
      process.env.TENANT_ID
  );
}
