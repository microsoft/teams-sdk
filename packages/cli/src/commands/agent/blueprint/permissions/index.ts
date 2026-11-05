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
  type BlueprintPermissionListEntry,
} from './actions.js';

/**
 * Splits on commas and/or whitespace. Whitespace matters because an
 * unquoted comma list in PowerShell can arrive here already space-joined
 * (PowerShell parses the bare comma as array construction, then flattens
 * it to a space-separated string when forwarding through `teams.ps1`).
 */
function parseScopes(raw: string): string[] {
  return [...new Set(raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean))];
}

function printPermissionsTable(entries: BlueprintPermissionListEntry[]): void {
  for (const entry of entries) {
    logger.info(`${pc.bold(entry.resourceAppName)} ${pc.dim(`(${entry.resourceAppId})`)}`);
    for (const { scope, inheritable } of entry.scopes) {
      logger.info(`  ${scope} ${inheritable ? pc.dim('(inheritable)') : pc.dim('(not inheritable)')}`);
    }
  }
}

interface BlueprintPermissionsListOptions {
  json?: boolean;
}

const permissionsListCommand = new Command('list')
  .description('List a blueprint\'s granted permissions, flagging which ones every agent identity created from it auto-receives')
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
        logger.info(pc.dim('No permissions granted.'));
        return;
      }

      printPermissionsTable(entries);
    })
  );

interface BlueprintPermissionsAddOptions {
  resource: string;
  inheritable: boolean;
  json?: boolean;
}

const permissionsAddCommand = new Command('add')
  .description('Grant delegated scope(s) on a resource app to a blueprint and make them inheritable by every agent identity created from it')
  .argument('<blueprintId>', 'Agent blueprint (application) ID')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite)')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--no-inheritable', '[OPTIONAL] Grant the scope(s) directly to the blueprint without making them inheritable by spawned agent identities.')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintId: string, scopesArg: string, options: BlueprintPermissionsAddOptions) => {
      const scopes = parseScopes(scopesArg);
      if (scopes.length === 0) {
        throw new CliError('VALIDATION_MISSING', 'At least one scope is required.');
      }

      const resourceAppId = resolveResourceAppId(options.resource);
      const account = await requireAgentAccount(!!options.json);
      const result = await addBlueprintPermissions(blueprintId, account, resourceAppId, scopes, options.inheritable, !!options.json);

      if (options.json) {
        outputJson(result);
        return;
      }

      if (options.inheritable) {
        logger.info(pc.green(`Granted and configured as inheritable: ${scopes.join(', ')} (${result.resourceAppName}).`));
      } else {
        logger.info(pc.green(`Granted (not inheritable): ${scopes.join(', ')} (${result.resourceAppName}).`));
      }
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
  inheritable: boolean;
  json?: boolean;
}

const permissionsSetCommand = new Command('set')
  .description('Declaratively set a resource app\'s granted scopes on a blueprint to an exact list')
  .argument('<blueprintId>', 'Agent blueprint (application) ID')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite). Pass "" to clear all.')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--no-inheritable', '[OPTIONAL] Grant the scope(s) directly to the blueprint without making them inheritable by spawned agent identities.')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintId: string, scopesArg: string, options: BlueprintPermissionsSetOptions) => {
      const scopes = parseScopes(scopesArg);
      const resourceAppId = resolveResourceAppId(options.resource);
      const account = await requireAgentAccount(!!options.json);
      const result = await setBlueprintPermissions(blueprintId, account, resourceAppId, scopes, options.inheritable, !!options.json);

      if (options.json) {
        outputJson(result);
        return;
      }

      if (scopes.length === 0) {
        logger.info(pc.green(`Cleared all permissions for ${result.resourceAppName}.`));
      } else if (options.inheritable) {
        logger.info(pc.green(`Inheritable permissions set to: ${scopes.join(', ')} (${result.resourceAppName}).`));
      } else {
        logger.info(pc.green(`Permissions set (not inheritable): ${scopes.join(', ')} (${result.resourceAppName}).`));
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
