import type { AccountInfo } from '@azure/msal-node';
import {
  addInheritableResourcePermissions,
  getServicePrincipalById,
  grantDelegatedPermissions,
  listDelegatedPermissionGrants,
  listInheritablePermissions,
  MICROSOFT_GRAPH_APP_ID,
  POWER_PLATFORM_APP_ID,
  removeInheritableResourcePermissions,
  revokeDelegatedPermissions,
  setDelegatedPermissions,
  setInheritableResourcePermissions,
  SMBA_APP_ID,
  type InheritablePermissionEntry,
} from '../../../../apps/graph.js';
import { getAzAccessToken } from '../../../../utils/az.js';
import { CliError } from '../../../../utils/errors.js';
import { logger } from '../../../../utils/logger.js';
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
    return resource.trim().toLowerCase();
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

/** A scope directly granted to the blueprint's service principal, and whether it's also declared inheritable. */
export interface BlueprintPermissionScope {
  scope: string;
  inheritable: boolean;
}

export interface BlueprintPermissionListEntry {
  resourceAppId: string;
  resourceAppName: string;
  scopes: BlueprintPermissionScope[];
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

/**
 * `add`/`remove` only merge/subtract an explicit `enumerated` scope list.
 * A resource app configured with `allAllowedScopes` has no such list, so
 * reject mutating it and point the caller at `set` instead.
 */
function assertMutableInheritableEntry(existing: InheritablePermissionEntry[], resourceAppId: string): void {
  const kind = existing.find((e) => e.resourceAppId === resourceAppId)?.inheritableScopes?.kind;
  if (kind && kind !== 'enumerated') {
    throw new CliError(
      'AGENT_BLUEPRINT_PERMISSIONS_FAILED',
      `${resourceAppDisplayName(resourceAppId)} is currently configured to inherit "${kind}" scopes, not an explicit list. ` +
        `"add"/"remove" only support adjusting an explicit scope list -- use "teams agent blueprint permissions set" with the complete scope list instead.`
    );
  }
}

/**
 * List every scope directly granted to the blueprint's service principal, flagged with whether it's also inheritable.
 */
export async function listBlueprintPermissions(
  blueprintId: string,
  account: AccountInfo,
  silent: boolean
): Promise<BlueprintPermissionListEntry[]> {
  try {
    const target = await resolveBlueprintTarget(blueprintId, account, silent);
    const adminToken = await acquireAdminToken(account, silent);

    const [grants, inheritableEntries] = await withAgentSpinner(
      {
        start: 'Fetching granted and inheritable permissions...',
        success: 'Permissions fetched.',
        error: 'Failed to fetch permissions.',
      },
      silent,
      () =>
        Promise.all([
          listDelegatedPermissionGrants(adminToken, target.agentBlueprintServicePrincipalObjectId),
          listInheritablePermissions(adminToken, target.agentBlueprintObjectId),
        ])
    );

    logger.debug(`Raw inheritable entries: ${JSON.stringify(inheritableEntries)}`);

    const entries: BlueprintPermissionListEntry[] = [];
    for (const grant of grants) {
      const grantedScopes = grant.scope.split(' ').filter((s) => s.length > 0);
      if (grantedScopes.length === 0) continue;

      const resourceSp = await getServicePrincipalById(adminToken, grant.resourceId);
      const resourceAppId = resourceSp.appId;
      const inheritable = inheritableEntries.find((e) => e.resourceAppId === resourceAppId)?.inheritableScopes;
      const inheritableScopeSet = new Set(inheritable?.kind === 'enumerated' ? inheritable.scopes ?? [] : []);

      entries.push({
        resourceAppId,
        resourceAppName: resourceAppDisplayName(resourceAppId),
        scopes: grantedScopes.map((scope) => ({
          scope,
          inheritable: inheritable?.kind === 'allAllowed' || inheritableScopeSet.has(scope),
        })),
      });
    }

    return entries;
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_BLUEPRINT_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}

/** Grant scopes on a resource app to the blueprint, optionally also marking them inheritable. Equivalent of `teams app rsc add`. */
export async function addBlueprintPermissions(
  blueprintId: string,
  account: AccountInfo,
  resourceAppId: string,
  scopes: string[],
  inheritable: boolean,
  silent: boolean
): Promise<BlueprintPermissionEntry> {
  try {
    const target = await resolveBlueprintTarget(blueprintId, account, silent);
    const adminToken = await acquireAdminToken(account, silent);

    const existing = await listInheritablePermissions(adminToken, target.agentBlueprintObjectId);
    assertMutableInheritableEntry(existing, resourceAppId);
    const inheritableScopes = inheritable
      ? [...new Set([...currentEnumeratedScopes(existing, resourceAppId), ...scopes])]
      : currentEnumeratedScopes(existing, resourceAppId);

    await withAgentSpinner(
      {
        start: `Granting ${resourceAppDisplayName(resourceAppId)} permission(s): ${scopes.join(', ')}...`,
        success: 'Permission(s) granted.',
        error: 'Failed to grant the requested permission(s).',
      },
      silent,
      () => grantDelegatedPermissions(adminToken, target.agentBlueprintServicePrincipalObjectId, resourceAppId, scopes)
    );

    if (inheritable) {
      await withAgentSpinner(
        {
          start: 'Configuring inheritable permissions...',
          success: 'Inheritable permissions configured.',
          error: 'Failed to configure inheritable permissions.',
        },
        silent,
        () => addInheritableResourcePermissions(adminToken, target.agentBlueprintObjectId, resourceAppId, scopes)
      );
    }

    return { resourceAppId, resourceAppName: resourceAppDisplayName(resourceAppId), kind: 'enumerated', scopes: inheritableScopes };
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
    assertMutableInheritableEntry(existing, resourceAppId);
    const remaining = currentEnumeratedScopes(existing, resourceAppId).filter((s) => !scopes.includes(s));

    await withAgentSpinner(
      {
        start: `Revoking ${resourceAppDisplayName(resourceAppId)} permission(s): ${scopes.join(', ')}...`,
        success: 'Permission(s) revoked.',
        error: 'Failed to revoke the requested permission(s).',
      },
      silent,
      () => revokeDelegatedPermissions(adminToken, target.agentBlueprintServicePrincipalObjectId, resourceAppId, scopes)
    );

    await withAgentSpinner(
      {
        start: remaining.length === 0 ? 'Removing inheritable permissions entry...' : 'Updating inheritable permissions...',
        success: remaining.length === 0 ? 'Inheritable permissions entry removed.' : 'Inheritable permissions updated.',
        error: 'Failed to update inheritable permissions.',
      },
      silent,
      () => removeInheritableResourcePermissions(adminToken, target.agentBlueprintObjectId, resourceAppId, scopes)
    );

    return { resourceAppId, resourceAppName: resourceAppDisplayName(resourceAppId), kind: 'enumerated', scopes: remaining };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_BLUEPRINT_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}

/** Declaratively set a resource app's scopes to an exact list, optionally also as inheritable. Equivalent of `teams app rsc set`. */
export async function setBlueprintPermissions(
  blueprintId: string,
  account: AccountInfo,
  resourceAppId: string,
  scopes: string[],
  inheritable: boolean,
  silent: boolean
): Promise<BlueprintPermissionEntry> {
  try {
    const target = await resolveBlueprintTarget(blueprintId, account, silent);
    const adminToken = await acquireAdminToken(account, silent);

    await withAgentSpinner(
      {
        start: scopes.length === 0 ? `Clearing ${resourceAppDisplayName(resourceAppId)} permission(s)...` : `Setting ${resourceAppDisplayName(resourceAppId)} permission(s): ${scopes.join(', ')}...`,
        success: 'Permission(s) set.',
        error: 'Failed to set the requested permission(s).',
      },
      silent,
      () => setDelegatedPermissions(adminToken, target.agentBlueprintServicePrincipalObjectId, resourceAppId, scopes)
    );

    const inheritableScopes = inheritable ? scopes : [];
    await withAgentSpinner(
      {
        start: inheritableScopes.length === 0 ? 'Removing inheritable permissions entry...' : 'Setting inheritable permissions...',
        success: inheritableScopes.length === 0 ? 'Inheritable permissions entry removed.' : 'Inheritable permissions set.',
        error: 'Failed to set inheritable permissions.',
      },
      silent,
      () => setInheritableResourcePermissions(adminToken, target.agentBlueprintObjectId, resourceAppId, inheritableScopes)
    );

    return { resourceAppId, resourceAppName: resourceAppDisplayName(resourceAppId), kind: 'enumerated', scopes: inheritableScopes };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_BLUEPRINT_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}
