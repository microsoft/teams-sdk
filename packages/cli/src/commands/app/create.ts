import { input, select } from '@inquirer/prompts';
import { Command } from 'commander';
import pc from 'picocolors';
import {
  type BotScope,
  normalizeAppMetadata,
  validateAppMetadata,
  validateAppMetadataField,
  validateEndpoint,
  type AzureContext,
  type BotLocation,
} from '../../apps/index.js';
import { getAccount } from '../../auth/index.js';
import { isJsonFile, outputCredentials, writeEnvFile, writeJsonCredentials } from '../../utils/env.js';
import { CliError, wrapAction } from '../../utils/errors.js';
import { readAndValidateIcon } from '../../utils/icon.js';
import { outputJson } from '../../utils/json-output.js';
import { logger } from '../../utils/logger.js';
import { isInteractive, confirmAction } from '../../utils/interactive.js';
import { getConfig } from '../../utils/config.js';
import { ensureAz, runAz } from '../../utils/az.js';
import { resolveSubscription, resolveResourceGroup, ensureTenantMatch } from '../../utils/az-prompts.js';
import { createSilentSpinner } from '../../utils/spinner.js';
import { openInBrowser, printLinkBanner } from '../../utils/browser.js';
import {
  collectCreateAdvancedOptions,
  isSignInAudienceOption,
  SIGN_IN_AUDIENCE_BY_OPTION,
  type SignInAudienceOption,
} from './create-advanced.js';
import {
  createApp,
  type AppCreateInput,
  type AppCreateProgress,
  type AppCreateResult,
} from './create-action.js';

export interface AppCreateOutput {
  appName: string;
  teamsAppId: string;
  botId: string;
  endpoint: string | null;
  installLink: string;
  portalLink: string;
  botLocation: 'teams-managed' | 'azure';
  secretSkipped?: boolean;
  credentials?: {
    CLIENT_ID: string;
    CLIENT_SECRET?: string;
    TENANT_ID: string;
  };
  credentialsFile?: string;
}

export interface CreateOptions {
  name?: string;
  endpoint?: string;
  serviceManagementReference?: string;
  signInAudience?: string;
  env?: string;
  envFile?: string;
  colorIcon?: string;
  outlineIcon?: string;
  secret?: boolean;
  azure?: boolean;
  teamsManaged?: boolean;
  subscription?: string;
  resourceGroup?: string;
  createResourceGroup?: boolean;
  region?: string;
  json?: boolean;
}

export interface AppCreateRunOptions {
  defaultName?: string;
  suppressCredentialOutput?: boolean;
  skipPostCreateActions?: boolean;
}

interface PreparedAppCreate {
  input: AppCreateInput;
  envPath: string | undefined;
  summaryLines: [string, string][];
  silent: boolean;
}

function parseSignInAudienceOption(value: string): SignInAudienceOption {
  if (!isSignInAudienceOption(value)) {
    throw new CliError(
      'VALIDATION_FORMAT',
      '--sign-in-audience must be myOrg or multipleOrgs.'
    );
  }
  return value;
}

export async function runAppCreate(
  options: CreateOptions,
  runOptions: AppCreateRunOptions = {}
): Promise<AppCreateOutput | undefined> {
  const prepared = await prepareAppCreate(options, runOptions);

  if (isInteractive() && !prepared.silent) {
    logger.info('');
    for (const [label, value] of prepared.summaryLines) {
      logger.info(`  ${pc.dim(`${label}:`)}  ${value}`);
    }
    logger.info('');
  }

  if (!(await confirmAction('Confirm creation?', prepared.silent))) {
    return undefined;
  }

  const result = await createApp(
    prepared.input,
    createSpinnerProgress(prepared.silent || prepared.input.botLocation === 'azure')
  );
  const output = toAppCreateOutput(result, prepared.envPath);
  await renderAppCreateResult(output, result, prepared.envPath, options, runOptions);
  return output;
}

async function prepareAppCreate(
  options: CreateOptions,
  runOptions: AppCreateRunOptions
): Promise<PreparedAppCreate> {
  const silent = !!options.json;

  if (options.azure && options.teamsManaged) {
    throw new CliError('VALIDATION_CONFLICT', 'Cannot specify both --azure and --teams-managed.');
  }

  const serviceManagementReference = options.serviceManagementReference?.trim();
  let signInAudienceOption = parseSignInAudienceOption(options.signInAudience ?? 'multipleOrgs');
  const earlyColorIcon = options.colorIcon ? readAndValidateIcon(options.colorIcon, 192) : undefined;
  const earlyOutlineIcon = options.outlineIcon
    ? readAndValidateIcon(options.outlineIcon, 32)
    : undefined;
  const interactive = isInteractive();

  if (!interactive && !options.name && !runOptions.defaultName) {
    throw new CliError('VALIDATION_MISSING', '--name is required in non-interactive mode.');
  }

  const hasFlags = !!options.name;
  const name =
    options.name ??
    (interactive && !hasFlags
      ? await input({
          message: 'App name:',
          default: runOptions.defaultName,
          validate: (value) => validateAppMetadataField('shortName', value, 'create') ?? true,
        })
      : runOptions.defaultName);

  if (!name?.trim()) {
    throw new CliError('VALIDATION_MISSING', 'App name cannot be empty.');
  }

  const endpoint =
    options.endpoint ??
    (interactive && !hasFlags
      ? (await input({
          message: 'Bot messaging endpoint URL (leave empty to skip):',
          validate: (value) => {
            if (!value.trim()) return true;
            return validateEndpoint(value.trim()) ?? true;
          },
        })) || undefined
      : undefined);

  const shouldPromptForEnvPath =
    !runOptions.suppressCredentialOutput && interactive && !hasFlags && !options.json;
  const envPath =
    (options.envFile ?? options.env) ??
    (shouldPromptForEnvPath
      ? (await input({
          message:
            'Path to credentials file, e.g. .env or appsettings.json (leave empty to show in terminal):',
        })) || undefined
      : undefined);

  const generateSecret = options.secret !== false;
  let descriptionOpts: { short: string; full?: string } | undefined;
  let scopeChoices: BotScope[] | undefined;
  let developerOpts:
    | {
        name: string;
        websiteUrl: string;
        privacyUrl: string;
        termsOfUseUrl: string;
      }
    | undefined;

  if (interactive && !hasFlags && !options.json) {
    const advancedOptions = await collectCreateAdvancedOptions();
    descriptionOpts = advancedOptions.manifest.description;
    scopeChoices = advancedOptions.manifest.scopes;
    developerOpts = advancedOptions.manifest.developer;
    signInAudienceOption = parseSignInAudienceOption(
      options.signInAudience ?? advancedOptions.appRegistration?.signInAudience ?? signInAudienceOption
    );
    if (advancedOptions.manifest.icons) {
      options.colorIcon ??= advancedOptions.manifest.icons.colorIconPath;
      options.outlineIcon ??= advancedOptions.manifest.icons.outlineIconPath;
    }
  }

  const colorIconPath = options.colorIcon;
  const outlineIconPath = options.outlineIcon;
  const colorIcon = colorIconPath
    ? (earlyColorIcon ?? readAndValidateIcon(colorIconPath, 192))
    : undefined;
  const outlineIcon = outlineIconPath
    ? (earlyOutlineIcon ?? readAndValidateIcon(outlineIconPath, 32))
    : undefined;

  const createMetadata = normalizeAppMetadata({
    shortName: name,
    longName: name,
    shortDescription: descriptionOpts?.short ?? name,
    longDescription: descriptionOpts?.full ?? descriptionOpts?.short ?? name,
    developerName: developerOpts?.name ?? 'Developer',
    websiteUrl: developerOpts?.websiteUrl ?? 'https://www.example.com',
    privacyUrl: developerOpts?.privacyUrl ?? 'https://www.example.com/privacy',
    termsOfUseUrl: developerOpts?.termsOfUseUrl ?? 'https://www.example.com/terms',
    endpoint,
  });
  const validationIssues = validateAppMetadata(createMetadata, 'create');
  if (validationIssues.length > 0) {
    throw new CliError('VALIDATION_FORMAT', validationIssues[0]!.message);
  }

  const normalizedName = createMetadata.shortName!;
  const normalizedEndpoint = createMetadata.endpoint;
  const normalizedDescriptionOpts = descriptionOpts
    ? {
        short: createMetadata.shortDescription!,
        full: createMetadata.longDescription!,
      }
    : undefined;
  const normalizedDeveloperOpts = developerOpts
    ? {
        name: createMetadata.developerName!,
        websiteUrl: createMetadata.websiteUrl!,
        privacyUrl: createMetadata.privacyUrl!,
        termsOfUseUrl: createMetadata.termsOfUseUrl!,
      }
    : undefined;

  let location: BotLocation;
  if (options.azure) location = 'azure';
  else if (options.teamsManaged) location = 'tm';
  else location = ((await getConfig('default-bot-location')) as BotLocation) ?? 'tm';

  let azureContext: AzureContext | undefined;
  if (location === 'azure') {
    const account = await getAccount();
    if (!account) {
      throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
    }
    await ensureAz();
    await ensureTenantMatch(account.tenantId);
    const subscription = await resolveSubscription(options.subscription);
    const resourceGroup = await resolveResourceGroup(subscription, options.resourceGroup);

    if (options.createResourceGroup) {
      const rgRegion = options.region ?? 'westus2';
      const rgSpinner = createSilentSpinner(
        `Creating resource group ${resourceGroup}...`,
        true
      ).start();
      await runAz([
        'group',
        'create',
        '--name',
        resourceGroup,
        '--location',
        rgRegion,
        '--subscription',
        subscription,
      ]);
      rgSpinner.success({ text: `Resource group ${resourceGroup} ready` });
    }

    azureContext = {
      subscription,
      resourceGroup,
      region: 'global',
      tenantId: account.tenantId,
    };
  }

  const summaryLines: [string, string][] = [['App name', normalizedName]];
  if (serviceManagementReference) {
    summaryLines.push(['Service management reference', serviceManagementReference]);
  }
  if (options.signInAudience || signInAudienceOption === 'myOrg') {
    summaryLines.push(['Sign-in audience', signInAudienceOption]);
  }
  if (azureContext) {
    summaryLines.push(['Subscription', azureContext.subscription]);
    summaryLines.push(['Resource group', azureContext.resourceGroup]);
  }
  if (normalizedEndpoint) summaryLines.push(['Endpoint', normalizedEndpoint]);
  if (normalizedDescriptionOpts?.short) summaryLines.push(['Description', normalizedDescriptionOpts.short]);
  if (scopeChoices && scopeChoices.length > 0) summaryLines.push(['Scopes', scopeChoices.join(', ')]);
  if (normalizedDeveloperOpts?.name) summaryLines.push(['Developer', normalizedDeveloperOpts.name]);
  if (colorIconPath) summaryLines.push(['Color icon', colorIconPath]);
  if (outlineIconPath) summaryLines.push(['Outline icon', outlineIconPath]);
  if (!generateSecret) summaryLines.push(['Secret', 'Skipped']);
  if (envPath) summaryLines.push(['Credentials file', envPath]);

  const appInput: AppCreateInput = {
    name: normalizedName,
    endpoint: normalizedEndpoint,
    serviceManagementReference,
    signInAudience: SIGN_IN_AUDIENCE_BY_OPTION[signInAudienceOption],
    generateSecret,
    botLocation: location,
    azureContext,
    description: normalizedDescriptionOpts,
    scopes: scopeChoices,
    developer: normalizedDeveloperOpts,
    colorIconBuffer: colorIcon?.buffer,
    outlineIconBuffer: outlineIcon?.buffer,
  };

  return { input: appInput, envPath, summaryLines, silent };
}

function createSpinnerProgress(silent: boolean): AppCreateProgress {
  let spinner:
    | {
        success(options: { text: string }): unknown;
        error(options: { text: string }): unknown;
      }
    | undefined;

  return {
    start(message: string): void {
      spinner = createSilentSpinner(message, silent).start();
    },
    success(message: string): void {
      spinner?.success({ text: message });
    },
    error(message: string): void {
      spinner?.error({ text: message });
    },
  };
}

function toAppCreateOutput(result: AppCreateResult, envPath: string | undefined): AppCreateOutput {
  return {
    appName: result.appName,
    teamsAppId: result.teamsAppId,
    botId: result.botId,
    endpoint: result.endpoint,
    installLink: result.installLink,
    portalLink: result.portalLink,
    botLocation: result.botLocation,
    ...(result.secretSkipped && { secretSkipped: true }),
    ...(envPath ? { credentialsFile: envPath } : { credentials: result.credentials }),
  };
}

async function renderAppCreateResult(
  output: AppCreateOutput,
  result: AppCreateResult,
  envPath: string | undefined,
  options: CreateOptions,
  runOptions: AppCreateRunOptions
): Promise<void> {
  if (options.json) {
    if (envPath) {
      if (isJsonFile(envPath)) {
        writeJsonCredentials(envPath, result.credentials);
      } else {
        writeEnvFile(envPath, result.credentials);
      }
    }
    outputJson(output);
    return;
  }

  logger.info(pc.bold(pc.green('\nApp created successfully!')));
  logger.info(`${pc.dim('Name:')} ${result.appName}`);
  logger.info(`${pc.dim('Teams App ID:')} ${result.teamsAppId}`);
  logger.info(`${pc.dim('Bot ID:')} ${result.botId}`);
  if (result.endpoint) {
    logger.info(`${pc.dim('Endpoint:')} ${result.endpoint}`);
  }
  logger.info('');
  printLinkBanner('Install in Teams', result.installLink);
  printLinkBanner('Developer Portal', result.portalLink);

  if (!runOptions.suppressCredentialOutput) {
    outputCredentials(envPath, result.credentials, 'Credentials:');
  }

  if (result.secretSkipped) {
    logger.info(`\nSecret generation skipped. To create one later, run:`);
    logger.info(`  ${pc.cyan(`teams app auth secret create ${result.teamsAppId}`)}`);
  }

  if (!isInteractive() || runOptions.skipPostCreateActions) return;

  try {
    while (true) {
      const action = await select({
        message: '',
        choices: [
          { name: 'Install in Teams', value: 'install' },
          { name: 'Open in Developer Portal', value: 'portal' },
          { name: 'Done', value: 'done' },
        ],
      });
      if (action === 'done') break;
      if (action === 'install') await openInBrowser(result.installLink);
      if (action === 'portal') await openInBrowser(result.portalLink);
    }
  } catch (error) {
    if (!(error instanceof Error && error.name === 'ExitPromptError')) throw error;
  }
}

export const appCreateCommand = new Command('create')
  .description('Create a new Teams app with bot')
  .option('-n, --name <name>', 'App/bot name')
  .option('-e, --endpoint <url>', '[OPTIONAL] Bot messaging endpoint URL')
  .option('--env <path>', '[OPTIONAL] Path to credentials file (.env or appsettings.json)')
  .option('--env-file <path>', '[OPTIONAL] Alias for --env')
  .option('--no-secret', '[OPTIONAL] Skip client secret generation (for managed identity or federated credentials)')
  .option('--azure', '[OPTIONAL] Create bot in Azure (requires az CLI)')
  .option('--teams-managed', '[OPTIONAL] Create bot managed by Teams (default)')
  .option('--service-management-reference <id>', '[OPTIONAL] ServiceTree service ID for Microsoft Entra app attribution')
  .option('--sign-in-audience <audience>', '[OPTIONAL] Microsoft Entra sign-in audience: myOrg or multipleOrgs')
  .option('--subscription <id>', '[OPTIONAL] Azure subscription ID (defaults to az CLI default)')
  .option('--resource-group <name>', 'Azure resource group (required for --azure)')
  .option('--create-resource-group', "[OPTIONAL] Create the resource group if it doesn't exist")
  .option('--region <name>', '[OPTIONAL] Azure region for resource group (default: westus2)')
  .option('--color-icon <path>', '[OPTIONAL] Path to color icon (192x192 PNG)')
  .option('--outline-icon <path>', '[OPTIONAL] Path to outline icon (32x32 PNG)')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (options: CreateOptions) => {
      await runAppCreate(options);
    })
  );
