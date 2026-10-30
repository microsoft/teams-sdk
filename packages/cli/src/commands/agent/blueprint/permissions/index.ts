import { Command } from 'commander';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { getGeneratedConfigPath, readGeneratedConfig } from '../../../../apps/agent-config.js';
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

/**
 * Resolves which blueprint to operate on: a `blueprintId` passed directly
 * on the command line always wins; otherwise falls back to the local
 * `agent.generated.config.json`, same pattern as `agent blueprint update`/`delete`.
 */
function resolveBlueprintId(blueprintIdArg: string | undefined, silent: boolean): string {
  if (blueprintIdArg) {
    return blueprintIdArg;
  }

  const cwd = process.cwd();
  if (!existsSync(getGeneratedConfigPath(cwd))) {
    throw new CliError(
      'AGENT_BLUEPRINT_ID_REQUIRED',
      'No agent.generated.config.json found in this folder.',
      'Pass the agent blueprint ID directly, e.g. `teams agent blueprint permissions add <blueprintId> <scopes>`.'
    );
  }

  const config = readGeneratedConfig(cwd);
  if (!silent) {
    logger.info(pc.dim(`Using agent blueprint ${config.agentBlueprintId} from agent.generated.config.json.`));
  }
  return config.agentBlueprintId;
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
  .argument('[blueprintId]', '[OPTIONAL] Agent blueprint (application) ID. Falls back to agent.generated.config.json when omitted.')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintIdArg: string | undefined, options: BlueprintPermissionsListOptions) => {
      const silent = !!options.json;
      const blueprintId = resolveBlueprintId(blueprintIdArg, silent);
      const account = await requireAgentAccount(silent);
      const entries = await listBlueprintPermissions(blueprintId, account, silent);

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
  .argument('[blueprintId]', '[OPTIONAL] Agent blueprint (application) ID. Falls back to agent.generated.config.json when omitted.')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite)')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintIdArg: string | undefined, scopesArg: string, options: BlueprintPermissionsAddOptions) => {
      const scopes = parseScopes(scopesArg);
      if (scopes.length === 0) {
        throw new CliError('VALIDATION_MISSING', 'At least one scope is required.');
      }

      const resourceAppId = resolveResourceAppId(options.resource);
      const silent = !!options.json;
      const blueprintId = resolveBlueprintId(blueprintIdArg, silent);
      const account = await requireAgentAccount(silent);
      const result = await addBlueprintPermissions(blueprintId, account, resourceAppId, scopes, silent);

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
  .argument('[blueprintId]', '[OPTIONAL] Agent blueprint (application) ID. Falls back to agent.generated.config.json when omitted.')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite)')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintIdArg: string | undefined, scopesArg: string, options: BlueprintPermissionsRemoveOptions) => {
      const scopes = parseScopes(scopesArg);
      if (scopes.length === 0) {
        throw new CliError('VALIDATION_MISSING', 'At least one scope is required.');
      }

      const resourceAppId = resolveResourceAppId(options.resource);
      const silent = !!options.json;
      const blueprintId = resolveBlueprintId(blueprintIdArg, silent);
      const account = await requireAgentAccount(silent);
      const result = await removeBlueprintPermissions(blueprintId, account, resourceAppId, scopes, silent);

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
  .argument('[blueprintId]', '[OPTIONAL] Agent blueprint (application) ID. Falls back to agent.generated.config.json when omitted.')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite). Pass "" to clear all.')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (blueprintIdArg: string | undefined, scopesArg: string, options: BlueprintPermissionsSetOptions) => {
      const scopes = parseScopes(scopesArg);
      const resourceAppId = resolveResourceAppId(options.resource);
      const silent = !!options.json;
      const blueprintId = resolveBlueprintId(blueprintIdArg, silent);
      const account = await requireAgentAccount(silent);
      const result = await setBlueprintPermissions(blueprintId, account, resourceAppId, scopes, silent);

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
