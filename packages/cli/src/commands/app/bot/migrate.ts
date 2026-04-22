import { Command } from 'commander';
import pc from 'picocolors';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../../../auth/index.js';
import {
  fetchBot,
  deleteBot,
  registerBot,
  getBotLocation,
  createAzureBotHandler,
  fetchMeetingSubscription,
  setMeetingSubscription,
} from '../../../apps/index.js';
import { fetchAppDetailsV2 } from '../../../apps/api.js';
import { pickApp } from '../../../utils/app-picker.js';
import { ensureAz, runAz } from '../../../utils/az.js';
import { resolveSubscription, resolveResourceGroup, ensureTenantMatch } from '../../../utils/az-prompts.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { confirmAction } from '../../../utils/interactive.js';
import { outputJson } from '../../../utils/json-output.js';
import { logger } from '../../../utils/logger.js';
import { createSilentSpinner } from '../../../utils/spinner.js';

interface BotMigrateOutput {
  botId: string;
  appName: string;
  from: 'teams-managed';
  to: 'azure';
  endpoint: string | null;
  subscription: string;
  resourceGroup: string;
  warnings: string[];
}

interface MigrateOptions {
  subscription?: string;
  resourceGroup?: string;
  createResourceGroup?: boolean;
  region?: string;
  json?: boolean;
}

export const botMigrateCommand = new Command('migrate')
  .description('Migrate bot to Azure')
  .argument('[appId]', 'App ID')
  .option('--subscription <id>', '[OPTIONAL] Azure subscription ID')
  .option('--resource-group <name>', 'Azure resource group (required)')
  .option('--create-resource-group', "[OPTIONAL] Create the resource group if it doesn't exist")
  .option('--region <name>', '[OPTIONAL] Azure region for resource group (default: westus2)')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (appIdArg: string | undefined, options: MigrateOptions) => {
      const silent = !!options.json;
      const account = await getAccount();
      if (!account) {
        throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
      }

      let token: string;
      let appId: string;

      if (appIdArg) {
        token = (await getTokenSilent(teamsDevPortalScopes))!;
        if (!token) {
          throw new CliError(
            'AUTH_TOKEN_FAILED',
            'Failed to get token.',
            'Try `teams login` again.'
          );
        }
        appId = appIdArg;
      } else {
        const picked = await pickApp();
        token = picked.token;
        appId = picked.app.teamsAppId;
      }

      // Get bot details
      const details = await fetchAppDetailsV2(token, appId);
      if (!details.bots || details.bots.length === 0) {
        throw new CliError('NOT_FOUND_BOT', 'This app has no bots.');
      }

      const botId = details.bots[0].botId;

      // Check current location
      const spinner = createSilentSpinner('Checking bot location...', silent).start();
      const location = await getBotLocation(token, botId);
      spinner.stop();

      if (location === 'azure') {
        if (options.json) {
          outputJson({ botId, status: 'already_in_azure' });
        } else {
          logger.info(pc.yellow('This bot is already in Azure. No migration needed.'));
        }
        return;
      }

      if (!options.json) {
        logger.info(`${pc.dim('Bot ID:')} ${botId}`);
        logger.info(`${pc.dim('Current location:')} Teams (managed)`);
        logger.info();
      }

      // Confirm before Azure setup (avoid side effects like RG creation before user agrees)
      if (
        !(await confirmAction(
          'Migrate this bot to Azure? The existing registration will be replaced.',
          silent
        ))
      ) {
        return;
      }

      // Azure setup
      await ensureAz();
      const subscription = await resolveSubscription(options.subscription);
      const resourceGroup = await resolveResourceGroup(subscription, options.resourceGroup);
      await ensureTenantMatch(account.tenantId);

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

      // Get current bot details to preserve for Azure creation and potential rollback
      const detailSpinner = createSilentSpinner('Fetching bot details...', silent).start();
      const botDetails = await fetchBot(token, botId);
      const meetingSub = await fetchMeetingSubscription(token, botId);
      detailSpinner.stop();
      const botName = botDetails.name || details.shortName || 'Bot';
      const botEndpoint = botDetails.messagingEndpoint || '';

      if (meetingSub) {
        logger.debug(`Meeting subscriptions: ${meetingSub.eventTypes.join(', ')}`);
      }

      // Collect warnings about features that can't be automatically migrated
      const warnings: string[] = [];

      if (botDetails.configuredChannels.includes('m365extensions')) {
        warnings.push(
          'M365 Extensions channel cannot be automatically enabled in Azure. Re-enable it manually in the Azure portal after migration.'
        );
      }
      if (botDetails.callingEndpoint) {
        warnings.push(
          `Calling endpoint (${botDetails.callingEndpoint}) must be reconfigured in Azure portal > Bot Service > Channels > Teams > Calling.`
        );
      }

      // Print warnings for human output
      if (!options.json) {
        if (botDetails.configuredChannels.includes('m365extensions')) {
          logger.info(pc.yellow('\nWarning: This bot has the M365 Extensions channel enabled.'));
          logger.info(pc.yellow('This channel cannot be automatically enabled in Azure.'));
          logger.info(`Re-enable it manually in the Azure portal after migration.\n`);
        }
        if (botDetails.callingEndpoint) {
          logger.info(pc.yellow('\nWarning: This bot has a calling endpoint configured.'));
          logger.info(`${pc.dim('Calling endpoint:')} ${botDetails.callingEndpoint}`);
          logger.info(
            `Re-configure calling in Azure portal > Bot Service > Channels > Teams > Calling.\n`
          );
        }
      }

      // Set up Azure context
      const azureContext = {
        subscription,
        resourceGroup,
        region: 'global',
        tenantId: account.tenantId,
      };
      const handler = createAzureBotHandler(azureContext);
      const createOpts = {
        botId,
        name: botName,
        endpoint: botEndpoint || undefined,
        description: botDetails.description,
      };

      // Step 1: Validate Azure deployment with what-if (no resources created)
      const validateSpinner = createSilentSpinner('Validating Azure deployment...', silent).start();
      try {
        await handler.validateCreateBot(createOpts);
        validateSpinner.success({ text: 'Azure deployment validated' });
      } catch (error) {
        validateSpinner.error({ text: 'Azure deployment validation failed' });
        throw new CliError(
          'API_ARM_ERROR',
          error instanceof Error ? error.message : 'Azure deployment validation failed.',
          'No changes were made. Your bot is unchanged.'
        );
      }

      // Step 2: Delete Teams-managed registration (validated that Azure will succeed)
      const deleteSpinner = createSilentSpinner('Removing old registration...', silent).start();
      try {
        await deleteBot(token, botId);
        deleteSpinner.success({ text: 'Old registration removed' });
      } catch (error) {
        deleteSpinner.error({ text: 'Failed to remove old registration' });
        throw new CliError(
          'API_ERROR',
          error instanceof Error ? error.message : 'Failed to remove old registration.'
        );
      }

      // Step 3: Create Azure bot (already validated)
      const createSpinnerInst = createSilentSpinner('Creating Azure bot...', silent).start();
      try {
        await handler.createBot(createOpts);
        createSpinnerInst.success({ text: 'Azure bot created' });
      } catch (error) {
        createSpinnerInst.error({ text: 'Failed to create Azure bot' });
        logger.error(error instanceof Error ? error.message : 'Unknown error');

        // Rollback: re-register bot with all original details
        const rollbackSpinner = createSilentSpinner(
          'Rolling back — restoring previous registration...',
          silent
        ).start();
        try {
          await registerBot(token, {
            botId: botDetails.botId,
            name: botDetails.name,
            endpoint: botDetails.messagingEndpoint,
            description: botDetails.description,
            callingEndpoint: botDetails.callingEndpoint ?? undefined,
            configuredChannels: botDetails.configuredChannels,
          });
          // Restore meeting subscriptions if they existed
          if (meetingSub && meetingSub.eventTypes.length > 0) {
            await setMeetingSubscription(token, botId, meetingSub.eventTypes);
          }
          rollbackSpinner.success({ text: 'Previous registration restored' });

          if (options.json) {
            outputJson({
              ok: false,
              error: { code: 'API_ARM_ERROR', message: 'Migration failed' },
              rolledBack: true,
            });
          } else {
            logger.info(pc.yellow('Migration failed but your bot has been restored.'));
          }
        } catch {
          rollbackSpinner.error({ text: 'Rollback failed' });
          if (options.json) {
            outputJson({
              ok: false,
              error: { code: 'API_ARM_ERROR', message: 'Migration failed and rollback failed' },
              rolledBack: false,
            });
          } else {
            logger.error(pc.red('Could not restore previous registration. Re-register manually:'));
            logger.error(pc.cyan(`  teams app create --name "${botName}" --teams-managed`));
          }
        }
        process.exit(1);
      }

      if (options.json) {
        const result: BotMigrateOutput = {
          botId,
          appName: botName,
          from: 'teams-managed',
          to: 'azure',
          endpoint: botEndpoint || null,
          subscription,
          resourceGroup,
          warnings,
        };
        outputJson(result);
      } else {
        logger.info(pc.bold(pc.green('\nBot migrated to Azure!')));
        logger.info(
          pc.dim('Your credentials (CLIENT_ID, CLIENT_SECRET, TENANT_ID) are unchanged.')
        );
      }
    })
  );
