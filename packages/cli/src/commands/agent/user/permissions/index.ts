import { Command } from 'commander';
import pc from 'picocolors';
import { outputJson } from '../../../../utils/json-output.js';
import { CliError, wrapAction } from '../../../../utils/errors.js';
import { logger } from '../../../../utils/logger.js';
import { requireAgentAccount } from '../../shared.js';
import {
  addAgentUserPermissions,
  listAgentUserPermissions,
  removeAgentUserPermissions,
  resolveResourceAppId,
  setAgentUserPermissions,
  type AgentUserPermissionEntry,
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

function printPermissionsTable(entries: AgentUserPermissionEntry[]): void {
  for (const entry of entries) {
    logger.info(`${pc.bold(entry.resourceAppName)} ${pc.dim(`(${entry.resourceAppId})`)}`);
    if (entry.scopes.length > 0) {
      logger.info(`  ${entry.scopes.join(', ')}`);
    }
  }
}

interface AgentUserPermissionsListOptions {
  json?: boolean;
}

const permissionsListCommand = new Command('list')
  .description("List an agentic user's agent identity's directly-granted delegated permissions")
  .argument('<userIdOrUpn>', 'Agentic user\u2019s object ID or UPN')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (userIdOrUpn: string, options: AgentUserPermissionsListOptions) => {
      const account = await requireAgentAccount(!!options.json);
      const entries = await listAgentUserPermissions(userIdOrUpn, account, !!options.json);

      if (options.json) {
        outputJson(entries);
        return;
      }

      if (entries.length === 0) {
        logger.info(pc.dim('No permissions granted directly to this agent identity.'));
        return;
      }

      printPermissionsTable(entries);
    })
  );

interface AgentUserPermissionsAddOptions {
  resource: string;
  json?: boolean;
}

const permissionsAddCommand = new Command('add')
  .description("Grant delegated scope(s) on a resource app directly to an agentic user's agent identity")
  .argument('<userIdOrUpn>', 'Agentic user\u2019s object ID or UPN')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite)')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (userIdOrUpn: string, scopesArg: string, options: AgentUserPermissionsAddOptions) => {
      const scopes = parseScopes(scopesArg);
      if (scopes.length === 0) {
        throw new CliError('VALIDATION_MISSING', 'At least one scope is required.');
      }

      const resourceAppId = resolveResourceAppId(options.resource);
      const account = await requireAgentAccount(!!options.json);
      const result = await addAgentUserPermissions(userIdOrUpn, account, resourceAppId, scopes, !!options.json);

      if (options.json) {
        outputJson(result);
        return;
      }

      logger.info(pc.green(`Granted: ${scopes.join(', ')} (${result.resourceAppName}).`));
    })
  );

interface AgentUserPermissionsRemoveOptions {
  resource: string;
  json?: boolean;
}

const permissionsRemoveCommand = new Command('remove')
  .description("Revoke delegated scope(s) on a resource app directly from an agentic user's agent identity")
  .argument('<userIdOrUpn>', 'Agentic user\u2019s object ID or UPN')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite)')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (userIdOrUpn: string, scopesArg: string, options: AgentUserPermissionsRemoveOptions) => {
      const scopes = parseScopes(scopesArg);
      if (scopes.length === 0) {
        throw new CliError('VALIDATION_MISSING', 'At least one scope is required.');
      }

      const resourceAppId = resolveResourceAppId(options.resource);
      const account = await requireAgentAccount(!!options.json);
      const result = await removeAgentUserPermissions(userIdOrUpn, account, resourceAppId, scopes, !!options.json);

      if (options.json) {
        outputJson(result);
        return;
      }

      logger.info(pc.green(`Revoked: ${scopes.join(', ')} (${result.resourceAppName}).`));
    })
  );

interface AgentUserPermissionsSetOptions {
  resource: string;
  json?: boolean;
}

const permissionsSetCommand = new Command('set')
  .description("Declaratively set a resource app's scopes directly granted to an agentic user's agent identity to an exact list")
  .argument('<userIdOrUpn>', 'Agentic user\u2019s object ID or UPN')
  .argument('<scopes>', 'Comma-separated delegated scope names (e.g. Mail.ReadWrite,Chat.ReadWrite). Pass "" to clear all.')
  .option('--resource <name>', '[OPTIONAL] Resource app the scopes belong to: "graph", "smba", "powerplatform", or a resource app ID (GUID).', 'graph')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (userIdOrUpn: string, scopesArg: string, options: AgentUserPermissionsSetOptions) => {
      const scopes = parseScopes(scopesArg);
      const resourceAppId = resolveResourceAppId(options.resource);
      const account = await requireAgentAccount(!!options.json);
      const result = await setAgentUserPermissions(userIdOrUpn, account, resourceAppId, scopes, !!options.json);

      if (options.json) {
        outputJson(result);
        return;
      }

      if (scopes.length === 0) {
        logger.info(pc.green(`Cleared all directly-granted permissions for ${result.resourceAppName}.`));
      } else {
        logger.info(pc.green(`Permissions set to: ${scopes.join(', ')} (${result.resourceAppName}).`));
      }
    })
  );

export const agentUserPermissionsCommand = new Command('permissions')
  .description("Manage an agentic user's agent identity's directly-granted Microsoft Graph (and other resource app) permissions")
  .action(function (this: Command) {
    this.help();
  });

agentUserPermissionsCommand.addCommand(permissionsListCommand);
agentUserPermissionsCommand.addCommand(permissionsAddCommand);
agentUserPermissionsCommand.addCommand(permissionsRemoveCommand);
agentUserPermissionsCommand.addCommand(permissionsSetCommand);
