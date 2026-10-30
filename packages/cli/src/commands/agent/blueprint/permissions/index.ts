import { Command } from 'commander';
import pc from 'picocolors';
import { outputJson } from '../../../../utils/json-output.js';
import { CliError, wrapAction } from '../../../../utils/errors.js';
import { logger } from '../../../../utils/logger.js';
import { requireAgentAccount } from '../../shared.js';
import {
  addBlueprintPermissions,
  listBlueprintPermissions,
  removeBlueprintPermissions,
  resolveResourceAppId,
  setBlueprintPermissions,
  type BlueprintPermissionEntry,
} from './actions.js';

function parseScopes(raw: string): string[] {
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
}

function printPermissionsTable(entries: BlueprintPermissionEntry[]): void {
  for (const entry of entries) {
    logger.info(`${pc.bold(entry.resourceAppName)} ${pc.dim(`(${entry.resourceAppId})`)} — ${entry.kind}`);
    if (entry.scopes.length > 0) {
      logger.info(`  ${entry.scopes.join(', ')}`);
    }
  }
}

interface BlueprintPermissionsListOptions {
  json?: boolean;
}

const permissionsListCommand = new Command('list')
  .description('List a blueprint\'s inheritable permissions (scopes every agent identity created from it auto-receives)')
  .argument('<blueprintId>', 'Agent blueprint (application) ID')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintId: string, options: BlueprintPermissionsListOptions) => {
      const account = await requireAgentAccount(!!options.json);
      const entries = await listBlueprintPermissions(blueprintId, account, !!options.json);

      if (options.json) {
        outputJson(entries);
        return;
      }

      if (entries.length === 0) {
        logger.info(pc.dim('No inheritable permissions configured.'));
        return;
      }

      printPermissionsTable(entries);
    })
  );

interface BlueprintPermissionsAddOptions {
  resource: string;
  json?: boolean;
}

const permissionsAddCommand = new Command('add')
  .description('Grant delegated scope(s) on a resource app to a blueprint and make them inheritable by every agent identity created from it')
  .argument('<blueprintId>', 'Agent blueprint (application) ID')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite)')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintId: string, scopesArg: string, options: BlueprintPermissionsAddOptions) => {
      const scopes = parseScopes(scopesArg);
      if (scopes.length === 0) {
        throw new CliError('VALIDATION_MISSING', 'At least one scope is required.');
      }

      const resourceAppId = resolveResourceAppId(options.resource);
      const account = await requireAgentAccount(!!options.json);
      const result = await addBlueprintPermissions(blueprintId, account, resourceAppId, scopes, !!options.json);

      if (options.json) {
        outputJson(result);
        return;
      }

      logger.info(pc.green(`Granted and configured as inheritable: ${scopes.join(', ')} (${result.resourceAppName}).`));
    })
  );

interface BlueprintPermissionsRemoveOptions {
  resource: string;
  json?: boolean;
}

const permissionsRemoveCommand = new Command('remove')
  .description('Revoke delegated scope(s) on a resource app from a blueprint and stop them from being inherited')
  .argument('<blueprintId>', 'Agent blueprint (application) ID')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite)')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintId: string, scopesArg: string, options: BlueprintPermissionsRemoveOptions) => {
      const scopes = parseScopes(scopesArg);
      if (scopes.length === 0) {
        throw new CliError('VALIDATION_MISSING', 'At least one scope is required.');
      }

      const resourceAppId = resolveResourceAppId(options.resource);
      const account = await requireAgentAccount(!!options.json);
      const result = await removeBlueprintPermissions(blueprintId, account, resourceAppId, scopes, !!options.json);

      if (options.json) {
        outputJson(result);
        return;
      }

      logger.info(pc.green(`Revoked: ${scopes.join(', ')} (${result.resourceAppName}).`));
    })
  );

interface BlueprintPermissionsSetOptions {
  resource: string;
  json?: boolean;
}

const permissionsSetCommand = new Command('set')
  .description('Declaratively set a resource app\'s inheritable scopes on a blueprint to an exact list')
  .argument('<blueprintId>', 'Agent blueprint (application) ID')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite). Pass "" to clear all.')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintId: string, scopesArg: string, options: BlueprintPermissionsSetOptions) => {
      const scopes = parseScopes(scopesArg);
      const resourceAppId = resolveResourceAppId(options.resource);
      const account = await requireAgentAccount(!!options.json);
      const result = await setBlueprintPermissions(blueprintId, account, resourceAppId, scopes, !!options.json);

      if (options.json) {
        outputJson(result);
        return;
      }

      if (scopes.length === 0) {
        logger.info(pc.green(`Cleared all inheritable permissions for ${result.resourceAppName}.`));
      } else {
        logger.info(pc.green(`Inheritable permissions set to: ${scopes.join(', ')} (${result.resourceAppName}).`));
      }
    })
  );

export const agentBlueprintPermissionsCommand = new Command('permissions')
  .description("Manage a blueprint's inheritable Microsoft Graph (and other resource app) permissions")
  .action(function (this: Command) {
    this.help();
  });

agentBlueprintPermissionsCommand.addCommand(permissionsListCommand);
agentBlueprintPermissionsCommand.addCommand(permissionsAddCommand);
agentBlueprintPermissionsCommand.addCommand(permissionsRemoveCommand);
agentBlueprintPermissionsCommand.addCommand(permissionsSetCommand);
