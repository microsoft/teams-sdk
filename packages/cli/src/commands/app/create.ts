import { input, select } from '@inquirer/prompts';
import { Command, Option } from 'commander';
import pc from 'picocolors';
import {
  type BotScope,
  isBotCommunicationApiAvailable,
  normalizeAppMetadata,
  validateAppMetadata,
  validateAppMetadataField,
  validateEndpoint,
  type AzureContext,
  type BotLocation,
} from '../../apps/index.js';
import { getAccount } from '../../auth/index.js';
import { outputCredentials, writeCredentials } from '../../utils/env.js';
import { resolveCredentialDestination } from '../../utils/credential-destination.js';
import { CliError, wrapAction } from '../../utils/errors.js';
import { readAndValidateIcon } from '../../utils/icon.js';
import { outputJson } from '../../utils/json-output.js';
import { logger } from '../../utils/logger.js';
import { isInteractive, confirmAction } from '../../utils/interactive.js';
import { getConfig } from '../../utils/config.js';
import { ensureAz, runAz } from '../../utils/az.js';
import { resolveSubscription, resolveResourceGroup, ensureTenantMatch } from '../../utils/az-prompts.js';
import { createSilentSpinner } from '../../utils/spinner.js';
import { BOT_COMMUNICATION_BASE_URL, DEV_API_ENV_VAR } from '../../utils/tdp-host.js';
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
  socketMode: boolean;
  socketModeError?: string;
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
  socket?: boolean;
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

  let location: BotLocation;
  if (options.azure) location = 'azure';
  else if (options.teamsManaged) location = 'tm';
  else location = ((await getConfig('default-bot-location')) as BotLocation) ?? 'tm';

  if (options.socket) {
    if (options.endpoint !== undefined) {
      throw new CliError('VALIDATION_CONFLICT', 'Cannot specify both --socket and --endpoint.');
    }
    if (!isBotCommunicationApiAvailable()) {
      throw new CliError(
        'VALIDATION_MISSING',
        'Socket mode is not available in this environment yet.',
        `Set ${DEV_API_ENV_VAR}=1 to use the dev-int Teams Developer Portal.`
      );
    }
    if (location === 'azure') {
      throw new CliError(
        'VALIDATION_CONFLICT',
        'Socket mode is only supported for Teams-managed bots.',
        'Use --teams-managed.'
      );
    }
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

  let socketMode = !!options.socket;
  if (
    !socketMode &&
    options.endpoint === undefined &&
    interactive &&
    !hasFlags &&
    location === 'tm' &&
    isBotCommunicationApiAvailable()
  ) {
    const transport = await select<'http' | 'socket'>({
      message: 'How should Teams deliver messages to your bot?',
      choices: [
        { name: 'HTTP endpoint', value: 'http' },
        { name: 'Socket mode', value: 'socket' },
      ],
    });
    socketMode = transport === 'socket';
  }

  const endpoint = socketMode
    ? undefined
    : (options.endpoint ??
      (interactive && !hasFlags
        ? (await input({
            message: 'Bot messaging endpoint URL (leave empty to skip):',
            validate: (value) => {
              if (!value.trim()) return true;
              return validateEndpoint(value.trim()) ?? true;
            },
          })) || undefined
        : undefined));

  const envPath = runOptions.suppressCredentialOutput
    ? (options.envFile ?? options.env)
    : await resolveCredentialDestination({
        explicit: options.envFile ?? options.env,
        interactive: interactive && !hasFlags,
        json: options.json,
      });

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
  if (socketMode) summaryLines.push(['Messaging', 'Socket mode']);
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
    socketMode,
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
    socketMode: result.socketMode,
    ...(result.socketModeError && { socketModeError: result.socketModeError }),
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
      writeCredentials(envPath, result.credentials);
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
  if (result.socketMode) {
    logger.info(`${pc.dim('Messaging:')} Socket mode`);
  }
  if (result.socketModeError) {
    logger.warn(pc.yellow(`\nSocket mode was not enabled: ${result.socketModeError}`));
    logger.warn(`  To retry, run: ${pc.cyan(`teams app update ${result.teamsAppId} --socket`)}`);
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
  .addOption(
    new Option(
      '--socket',
      '[OPTIONAL] Use socket mode instead of an HTTP endpoint (Teams-managed bots only)'
    ).hideHelp(BOT_COMMUNICATION_BASE_URL === undefined)
  )
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
