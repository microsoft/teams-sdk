import { input, select } from '@inquirer/prompts';
import { Command } from 'commander';
import pc from 'picocolors';
import {
  collectManifestCustomization,
  createAadAppViaTdp,
  createClientSecret,
  createManifestZip,
  getAadAppByClientId,
  importAppPackage,
  type ManifestOptions,
  type BotScope,
  createTdpBotHandler,
  createAzureBotHandler,
  validateEndpoint,
  type AzureContext,
  type BotLocation,
  installLink,
  portalLink,
} from '../../apps/index.js';
import { getAccount, getTokenSilent, graphScopes, teamsDevPortalScopes } from '../../auth/index.js';
import { type EnvValues, isJsonFile, outputCredentials, writeEnvFile, writeJsonCredentials } from '../../utils/env.js';
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

interface AppCreateOutput {
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

interface CreateOptions {
  name?: string;
  endpoint?: string;
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

export const appCreateCommand = new Command('create')
  .description('Create a new Teams app with bot')
  .option('-n, --name <name>', 'App/bot name')
  .option('-e, --endpoint <url>', '[OPTIONAL] Bot messaging endpoint URL')
  .option('--env <path>', '[OPTIONAL] Path to credentials file (.env or appsettings.json)')
  .option('--env-file <path>', '[OPTIONAL] Alias for --env')
  .option('--no-secret', '[OPTIONAL] Skip client secret generation (for managed identity or federated credentials)')
  .option('--azure', '[OPTIONAL] Create bot in Azure (requires az CLI)')
  .option('--teams-managed', '[OPTIONAL] Create bot managed by Teams (default)')
  .option('--subscription <id>', '[OPTIONAL] Azure subscription ID (defaults to az CLI default)')
  .option('--resource-group <name>', 'Azure resource group (required for --azure)')
  .option('--create-resource-group', "[OPTIONAL] Create the resource group if it doesn't exist")
  .option('--region <name>', '[OPTIONAL] Azure region for resource group (default: westus2)')
  .option('--color-icon <path>', '[OPTIONAL] Path to color icon (192x192 PNG)')
  .option('--outline-icon <path>', '[OPTIONAL] Path to outline icon (32x32 PNG)')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (options: CreateOptions) => {
      const silent = !!options.json;

      // Validate CLI flags upfront (before auth or any resource creation)
      if (options.azure && options.teamsManaged) {
        throw new CliError(
          'VALIDATION_CONFLICT',
          'Cannot specify both --azure and --teams-managed.'
        );
      }
      if (options.endpoint !== undefined) {
        const trimmedEndpoint = options.endpoint.trim();
        if (!trimmedEndpoint) {
          throw new CliError(
            'VALIDATION_FORMAT',
            'Bot messaging endpoint URL cannot be empty.'
          );
        }
        const endpointError = validateEndpoint(trimmedEndpoint);
        if (endpointError) {
          throw new CliError('VALIDATION_FORMAT', endpointError);
        }
        options.endpoint = trimmedEndpoint;
      }
      const earlyColorIcon = options.colorIcon ? readAndValidateIcon(options.colorIcon, 192) : undefined;
      const earlyOutlineIcon = options.outlineIcon ? readAndValidateIcon(options.outlineIcon, 32) : undefined;

      const account = await getAccount();
      if (!account) {
        throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
      }

      // Resolve bot location: explicit flag > config > default (teams-managed)
      let location: BotLocation;
      if (options.azure) location = 'azure';
      else if (options.teamsManaged) location = 'tm';
      else location = ((await getConfig('default-bot-location')) as BotLocation) ?? 'tm';

      // Gather Azure context if needed
      let azureContext: AzureContext | undefined;
      if (location === 'azure') {
        await ensureAz();
        await ensureTenantMatch(account.tenantId);
        const subscription = await resolveSubscription(options.subscription);
        const resourceGroup = await resolveResourceGroup(subscription, options.resourceGroup);

        if (options.createResourceGroup) {
          const rgRegion = options.region ?? 'westus2';
          const rgSpinner = createSilentSpinner(
            `Creating resource group ${resourceGroup}...`,
            silent
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

        // Bot Service location is always "global"
        azureContext = {
          subscription,
          resourceGroup,
          region: 'global',
          tenantId: account.tenantId,
        };
      }

      // ===== Gather all inputs upfront =====
      const interactive = isInteractive();

      if (!interactive && !options.name) {
        throw new CliError('VALIDATION_MISSING', '--name is required in non-interactive mode.');
      }

      // Determine if any flags were provided (scripting mode)
      const hasFlags = !!options.name;

      // Get name
      const name =
        options.name ??
        (interactive && !hasFlags ? await input({ message: 'App name:' }) : undefined);

      if (!name?.trim()) {
        throw new CliError('VALIDATION_MISSING', 'App name cannot be empty.');
      }

      // Get endpoint (prompt only in full interactive mode)
      const endpoint =
        options.endpoint ??
        (interactive && !hasFlags
          ? (await input({
              message: 'Bot messaging endpoint URL (leave empty to skip):',
              validate: (value) => {
                if (!value.trim()) return true; // allow empty (skip)
                return validateEndpoint(value.trim()) ?? true;
              },
            })) || undefined
          : undefined);

      // Get env path (prompt only in full interactive mode)
      const envPath =
        (options.envFile ?? options.env) ??
        (interactive && !hasFlags && !options.json
          ? (await input({
              message: 'Path to credentials file, e.g. .env or appsettings.json (leave empty to show in terminal):',
            })) || undefined
          : undefined);

      const generateSecret = options.secret !== false;

      // Collect manifest customization options
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
        const customization = await collectManifestCustomization();
        descriptionOpts = customization.description;
        scopeChoices = customization.scopes;
        developerOpts = customization.developer;
        if (customization.icons) {
          options.colorIcon ??= customization.icons.colorIconPath;
          options.outlineIcon ??= customization.icons.outlineIconPath;
        }
      }

      // Resolve icon paths (CLI flags take priority, then interactive selection)
      const colorIconPath = options.colorIcon;
      const outlineIconPath = options.outlineIcon;

      // Validate icons (reuse early result for flag-provided paths, otherwise validate now)
      const colorIcon = colorIconPath
        ? (earlyColorIcon ?? readAndValidateIcon(colorIconPath, 192))
        : undefined;
      const outlineIcon = outlineIconPath
        ? (earlyOutlineIcon ?? readAndValidateIcon(outlineIconPath, 32))
        : undefined;

      // ===== All inputs gathered — confirm before proceeding =====
      const summaryLines: [string, string][] = [['App name', name]];
      if (azureContext) {
        summaryLines.push(['Subscription', azureContext.subscription]);
        summaryLines.push(['Resource group', azureContext.resourceGroup]);
      }
      if (endpoint) summaryLines.push(['Endpoint', endpoint]);
      if (descriptionOpts?.short.trim())
        summaryLines.push(['Description', descriptionOpts.short.trim()]);
      if (scopeChoices && scopeChoices.length > 0)
        summaryLines.push(['Scopes', scopeChoices.join(', ')]);
      if (developerOpts?.name.trim()) summaryLines.push(['Developer', developerOpts.name.trim()]);
      if (colorIconPath) summaryLines.push(['Color icon', colorIconPath]);
      if (outlineIconPath) summaryLines.push(['Outline icon', outlineIconPath]);
      if (!generateSecret) summaryLines.push(['Secret', 'Skipped']);
      if (envPath) summaryLines.push(['Credentials file', envPath]);

      if (interactive && !silent) {
        logger.info('');
        for (const [label, value] of summaryLines) {
          logger.info(`  ${pc.dim(`${label}:`)}  ${value}`);
        }
        logger.info('');
      }

      if (!(await confirmAction('Confirm creation?', silent))) {
        return;
      }

      // Get tokens
      let spinner = createSilentSpinner('Acquiring tokens...', silent).start();

      // Graph token only needed for secret generation
      let graphToken: string | null | undefined;
      if (generateSecret) {
        graphToken = await getTokenSilent(graphScopes);
        if (!graphToken) {
          spinner.error({ text: 'Failed to get Graph token' });
          throw new CliError(
            'AUTH_TOKEN_FAILED',
            'Failed to get Graph token.',
            'Try `teams login` again.'
          );
        }
      }

      const tdpToken = await getTokenSilent(teamsDevPortalScopes);
      if (!tdpToken) {
        spinner.error({ text: 'Failed to get TDP token' });
        throw new CliError(
          'AUTH_TOKEN_FAILED',
          'Failed to get TDP token.',
          'Try `teams login` again.'
        );
      }
      spinner.success({ text: 'Tokens acquired' });

      // Create AAD app via TDP (creates service principal server-side)
      spinner = createSilentSpinner('Creating Azure AD app...', silent).start();
      const aadApp = await createAadAppViaTdp(tdpToken, name!);
      const clientId = aadApp.appId;
      spinner.success({ text: `Created Azure AD app (${clientId})` });

      // Generate manifest
      const manifestOpts: ManifestOptions = {
        botId: clientId,
        botName: name!,
        endpoint,
        description: descriptionOpts,
        scopes: scopeChoices,
        developer: developerOpts,
        colorIconBuffer: colorIcon?.buffer,
        outlineIconBuffer: outlineIcon?.buffer,
      };

      const zipBuffer = createManifestZip(manifestOpts);

      // Generate client secret (skipped with --no-secret)
      let secretText: string | undefined;
      if (generateSecret) {
        spinner = createSilentSpinner('Generating client secret...', silent).start();
        let graphApp: { id: string } | null = null;
        for (let i = 0; i < 10; i++) {
          try {
            graphApp = await getAadAppByClientId(graphToken!, clientId);
            break;
          } catch {
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
        if (!graphApp) {
          throw new Error('AAD app not yet available in Graph API. Try again shortly.');
        }
        const secret = await createClientSecret(graphToken!, graphApp.id);
        secretText = secret.secretText;
        spinner.success({ text: 'Generated client secret' });
      }

      // Import to Teams
      spinner = createSilentSpinner('Creating Teams app...', silent).start();
      const importedApp = await importAppPackage(tdpToken, zipBuffer);
      const teamsAppId = importedApp.teamsAppId;
      spinner.success({ text: `Created Teams app (${teamsAppId})` });

      // Register bot
      spinner = createSilentSpinner('Registering bot...', silent).start();
      const handler =
        location === 'tm' ? createTdpBotHandler(tdpToken) : createAzureBotHandler(azureContext!);
      await handler.createBot({ botId: clientId, name: name!, endpoint });
      spinner.success({ text: 'Bot registered' });

      // Output results
      const install = installLink(teamsAppId, account.tenantId);
      const portal = portalLink(teamsAppId);

      const secretSkipped = !generateSecret;
      const credentialValues: EnvValues = {
        CLIENT_ID: clientId,
        ...(secretText !== undefined && { CLIENT_SECRET: secretText }),
        TENANT_ID: account.tenantId,
      };

      if (options.json) {
        if (envPath) {
          if (isJsonFile(envPath)) {
            writeJsonCredentials(envPath, credentialValues);
          } else {
            writeEnvFile(envPath, credentialValues);
          }
        }

        const result: AppCreateOutput = {
          appName: name!,
          teamsAppId,
          botId: clientId,
          endpoint: endpoint ?? null,
          installLink: install,
          portalLink: portal,
          botLocation: location === 'tm' ? 'teams-managed' : 'azure',
          ...(secretSkipped && { secretSkipped: true }),
          ...(envPath
            ? { credentialsFile: envPath }
            : { credentials: credentialValues }),
        };
        outputJson(result);
      } else {
        logger.info(pc.bold(pc.green('\nApp created successfully!')));
        logger.info(`${pc.dim('Name:')} ${name!}`);
        logger.info(`${pc.dim('Teams App ID:')} ${teamsAppId}`);
        logger.info(`${pc.dim('Bot ID:')} ${clientId}`);
        if (endpoint) {
          logger.info(`${pc.dim('Endpoint:')} ${endpoint}`);
        }
        logger.info('');
        printLinkBanner('Install in Teams', install);
        printLinkBanner('Developer Portal', portal);

        outputCredentials(envPath, credentialValues, 'Credentials:');

        if (secretSkipped) {
          logger.info(`\nSecret generation skipped. To create one later, run:`);
          logger.info(`  ${pc.cyan(`teams app auth secret create ${teamsAppId}`)}`);
        }

        if (isInteractive()) {
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
              if (action === 'install') await openInBrowser(install);
              if (action === 'portal') await openInBrowser(portal);
            }
          } catch (error) {
            if (!(error instanceof Error && error.name === 'ExitPromptError')) throw error;
          }
        }
      }
    })
  );
