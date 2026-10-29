import type { AccountInfo } from '@azure/msal-node';
import {
  configureInheritableResourcePermissions,
  grantDelegatedPermissions,
  listInheritablePermissions,
  MICROSOFT_GRAPH_APP_ID,
  POWER_PLATFORM_APP_ID,
  removeInheritablePermission,
  revokeDelegatedPermissions,
  SMBA_APP_ID,
  type InheritablePermissionEntry,
} from '../../../../apps/graph.js';
import { getAzAccessToken } from '../../../../utils/az.js';
import { CliError } from '../../../../utils/errors.js';
import { withAgentSpinner } from '../../shared.js';
import { resolveBlueprintCleanupTarget, type AgentBlueprintCleanupTarget } from '../actions.js';

/** Known resource app IDs get a friendly display name; anything else shows its raw GUID. */
const RESOURCE_APP_DISPLAY_NAMES: Record<string, string> = {
  [MICROSOFT_GRAPH_APP_ID]: 'Microsoft Graph',
  [SMBA_APP_ID]: 'Messaging Bot API',
  [POWER_PLATFORM_APP_ID]: 'Power Platform API',
};

export function resourceAppDisplayName(resourceAppId: string): string {
  return RESOURCE_APP_DISPLAY_NAMES[resourceAppId] ?? resourceAppId;
}

/** Friendly aliases users can pass via `--resource` instead of a raw GUID. */
const RESOURCE_APP_ALIASES: Record<string, string> = {
  graph: MICROSOFT_GRAPH_APP_ID,
  'microsoft-graph': MICROSOFT_GRAPH_APP_ID,
  smba: SMBA_APP_ID,
  'messaging-bot-api': SMBA_APP_ID,
  bot: SMBA_APP_ID,
  powerplatform: POWER_PLATFORM_APP_ID,
  'power-platform': POWER_PLATFORM_APP_ID,
  pp: POWER_PLATFORM_APP_ID,
};

/**
 * Resolves a `--resource` value to a resource app ID: a known alias
 * (`graph`, `smba`, `powerplatform`, ...) or a raw GUID passed straight through.
 */
export function resolveResourceAppId(resource: string): string {
  const alias = RESOURCE_APP_ALIASES[resource.trim().toLowerCase()];
  if (alias) return alias;

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.trim())) {
    return resource.trim();
  }

  throw new CliError(
    'VALIDATION_FORMAT',
    `Unknown resource "${resource}". Use "graph", "smba", "powerplatform", or a resource app ID (GUID).`
  );
}

export interface BlueprintPermissionEntry {
  resourceAppId: string;
  resourceAppName: string;
  kind: string;
  scopes: string[];
}

function toBlueprintPermissionEntry(entry: InheritablePermissionEntry): BlueprintPermissionEntry {
  return {
    resourceAppId: entry.resourceAppId,
    resourceAppName: resourceAppDisplayName(entry.resourceAppId),
    kind: entry.inheritableScopes?.kind ?? 'unknown',
    scopes: entry.inheritableScopes?.scopes ?? [],
  };
}

async function resolveBlueprintTarget(blueprintId: string, account: AccountInfo, silent: boolean): Promise<AgentBlueprintCleanupTarget> {
  return resolveBlueprintCleanupTarget(blueprintId, account, silent);
}

async function acquireAdminToken(account: AccountInfo, silent: boolean): Promise<string> {
  return withAgentSpinner(
    {
      start: 'Acquiring an admin token via Azure CLI...',
      success: 'Admin token acquired.',
      error: 'Could not get an admin token from the Azure CLI.',
    },
    silent,
    () => getAzAccessToken('https://graph.microsoft.com', account.tenantId)
  );
}

/** Returns the current enumerated scopes for a resource app, or [] if none/not enumerated. */
function currentEnumeratedScopes(existing: InheritablePermissionEntry[], resourceAppId: string): string[] {
  const entry = existing.find((e) => e.resourceAppId === resourceAppId);
  return entry?.inheritableScopes?.kind === 'enumerated' ? (entry.inheritableScopes.scopes ?? []) : [];
}

/** List every resource app currently configured as inheritable on a blueprint. */
export async function listBlueprintPermissions(
  blueprintId: string,
  account: AccountInfo,
  silent: boolean
): Promise<BlueprintPermissionEntry[]> {
  try {
    const target = await resolveBlueprintTarget(blueprintId, account, silent);
    const adminToken = await acquireAdminToken(account, silent);

    const entries = await withAgentSpinner(
      {
        start: 'Fetching inheritable permissions...',
        success: 'Inheritable permissions fetched.',
        error: 'Failed to fetch inheritable permissions.',
      },
      silent,
      () => listInheritablePermissions(adminToken, target.agentBlueprintObjectId)
    );

    return entries.map(toBlueprintPermissionEntry);
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_BLUEPRINT_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Grant a set of delegated scopes on a resource app to the blueprint and
 * mark them inheritable, merging with any scopes the resource app is
 * already configured to inherit (so repeated `add` calls accumulate
 * instead of clobbering each other). Equivalent of `teams app rsc add`.
 */
export async function addBlueprintPermissions(
  blueprintId: string,
  account: AccountInfo,
  resourceAppId: string,
  scopes: string[],
  silent: boolean
): Promise<BlueprintPermissionEntry> {
  try {
    const target = await resolveBlueprintTarget(blueprintId, account, silent);
    const adminToken = await acquireAdminToken(account, silent);

    const existing = await listInheritablePermissions(adminToken, target.agentBlueprintObjectId);
    const merged = [...new Set([...currentEnumeratedScopes(existing, resourceAppId), ...scopes])];

    await withAgentSpinner(
      {
        start: `Granting ${resourceAppDisplayName(resourceAppId)} permission(s): ${scopes.join(', ')}...`,
        success: 'Permission(s) granted.',
        error: 'Failed to grant the requested permission(s).',
      },
      silent,
      () => grantDelegatedPermissions(adminToken, target.agentBlueprintServicePrincipalObjectId, resourceAppId, merged)
    );

    await withAgentSpinner(
      {
        start: 'Configuring inheritable permissions...',
        success: 'Inheritable permissions configured.',
        error: 'Failed to configure inheritable permissions.',
      },
      silent,
      () => configureInheritableResourcePermissions(adminToken, target.agentBlueprintObjectId, resourceAppId, merged)
    );

    return { resourceAppId, resourceAppName: resourceAppDisplayName(resourceAppId), kind: 'enumerated', scopes: merged };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_BLUEPRINT_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Revoke a set of previously-granted/inheritable scopes for a resource
 * app. Remaining scopes (if any) stay granted and inheritable; if none
 * are left, both the direct grant and the inheritable-permissions entry
 * for that resource app are removed entirely. Equivalent of `teams app
 * rsc remove`.
 */
export async function removeBlueprintPermissions(
  blueprintId: string,
  account: AccountInfo,
  resourceAppId: string,
  scopes: string[],
  silent: boolean
): Promise<BlueprintPermissionEntry> {
  try {
    const target = await resolveBlueprintTarget(blueprintId, account, silent);
    const adminToken = await acquireAdminToken(account, silent);

    const existing = await listInheritablePermissions(adminToken, target.agentBlueprintObjectId);
    const currentScopes = currentEnumeratedScopes(existing, resourceAppId);
    const remaining = currentScopes.filter((s) => !scopes.includes(s));

    await withAgentSpinner(
      {
        start: `Revoking ${resourceAppDisplayName(resourceAppId)} permission(s): ${scopes.join(', ')}...`,
        success: 'Permission(s) revoked.',
        error: 'Failed to revoke the requested permission(s).',
      },
      silent,
      () => revokeDelegatedPermissions(adminToken, target.agentBlueprintServicePrincipalObjectId, resourceAppId, scopes)
    );

    if (remaining.length === 0) {
      await withAgentSpinner(
        {
          start: 'Removing inheritable permissions entry...',
          success: 'Inheritable permissions entry removed.',
          error: 'Failed to remove the inheritable permissions entry.',
        },
        silent,
        () => removeInheritablePermission(adminToken, target.agentBlueprintObjectId, resourceAppId)
      );
    } else {
      await withAgentSpinner(
        {
          start: 'Updating inheritable permissions...',
          success: 'Inheritable permissions updated.',
          error: 'Failed to update inheritable permissions.',
        },
        silent,
        () => configureInheritableResourcePermissions(adminToken, target.agentBlueprintObjectId, resourceAppId, remaining)
      );
    }

    return { resourceAppId, resourceAppName: resourceAppDisplayName(resourceAppId), kind: 'enumerated', scopes: remaining };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_BLUEPRINT_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Declaratively set a resource app's inheritable scopes to an exact list,
 * granting newly-added scopes and revoking ones no longer present.
 * Equivalent of `teams app rsc set`.
 */
export async function setBlueprintPermissions(
  blueprintId: string,
  account: AccountInfo,
  resourceAppId: string,
  scopes: string[],
  silent: boolean
): Promise<BlueprintPermissionEntry> {
  try {
    const target = await resolveBlueprintTarget(blueprintId, account, silent);
    const adminToken = await acquireAdminToken(account, silent);

    const existing = await listInheritablePermissions(adminToken, target.agentBlueprintObjectId);
    const currentScopes = currentEnumeratedScopes(existing, resourceAppId);
    const toRevoke = currentScopes.filter((s) => !scopes.includes(s));

    if (scopes.length > 0) {
      await withAgentSpinner(
        {
          start: `Granting ${resourceAppDisplayName(resourceAppId)} permission(s): ${scopes.join(', ')}...`,
          success: 'Permission(s) granted.',
          error: 'Failed to grant the requested permission(s).',
        },
        silent,
        () => grantDelegatedPermissions(adminToken, target.agentBlueprintServicePrincipalObjectId, resourceAppId, scopes)
      );
    }

    if (toRevoke.length > 0) {
      await withAgentSpinner(
        {
          start: `Revoking ${resourceAppDisplayName(resourceAppId)} permission(s): ${toRevoke.join(', ')}...`,
          success: 'Permission(s) revoked.',
          error: 'Failed to revoke no-longer-requested permission(s).',
        },
        silent,
        () => revokeDelegatedPermissions(adminToken, target.agentBlueprintServicePrincipalObjectId, resourceAppId, toRevoke)
      );
    }

    if (scopes.length === 0) {
      await withAgentSpinner(
        {
          start: 'Removing inheritable permissions entry...',
          success: 'Inheritable permissions entry removed.',
          error: 'Failed to remove the inheritable permissions entry.',
        },
        silent,
        () => removeInheritablePermission(adminToken, target.agentBlueprintObjectId, resourceAppId)
      );
    } else {
      await withAgentSpinner(
        {
          start: 'Configuring inheritable permissions...',
          success: 'Inheritable permissions configured.',
          error: 'Failed to configure inheritable permissions.',
        },
        silent,
        () => configureInheritableResourcePermissions(adminToken, target.agentBlueprintObjectId, resourceAppId, scopes)
      );
    }

    return { resourceAppId, resourceAppName: resourceAppDisplayName(resourceAppId), kind: 'enumerated', scopes };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_BLUEPRINT_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}
