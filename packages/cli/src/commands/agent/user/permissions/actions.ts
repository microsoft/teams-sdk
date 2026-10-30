import type { AccountInfo } from '@azure/msal-node';
import {
  findDelegatedPermissionGrant,
  getAgenticUserByIdOrUpn,
  getServicePrincipalById,
  grantDelegatedPermissions,
  listDelegatedPermissionGrants,
  revokeDelegatedPermissions,
} from '../../../../apps/graph.js';
import { getAzAccessToken } from '../../../../utils/az.js';
import { CliError } from '../../../../utils/errors.js';
import { withAgentSpinner } from '../../shared.js';
import { resourceAppDisplayName } from '../../blueprint/permissions/actions.js';

export { resolveResourceAppId } from '../../blueprint/permissions/actions.js';

export interface AgentUserPermissionEntry {
  resourceAppId: string;
  resourceAppName: string;
  scopes: string[];
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

/**
 * Resolves an agentic user's object ID/UPN to its parent agent identity's
 * service principal object ID -- the `clientId` every direct
 * `oauth2PermissionGrant` for this identity is keyed on.
 */
async function resolveIdentityServicePrincipalId(userIdOrUpn: string, adminToken: string, silent: boolean): Promise<string> {
  const user = await withAgentSpinner(
    {
      start: 'Looking up agentic user...',
      success: 'Agentic user found.',
      error: 'Could not find an agentic user with that ID/UPN.',
    },
    silent,
    async () => {
      const result = await getAgenticUserByIdOrUpn(adminToken, userIdOrUpn);
      if (!result) {
        throw new CliError(
          'AGENT_IDENTITY_USER_NOT_FOUND',
          'No agentic user was found with that ID/UPN.',
          'Verify the agentic user ID or UPN is correct.'
        );
      }
      return result;
    }
  );

  return user.identityParentId;
}

/** List every delegated scope directly granted to an agentic user's agent identity, across all resource apps. */
export async function listAgentUserPermissions(
  userIdOrUpn: string,
  account: AccountInfo,
  silent: boolean
): Promise<AgentUserPermissionEntry[]> {
  try {
    const adminToken = await acquireAdminToken(account, silent);
    const identitySpId = await resolveIdentityServicePrincipalId(userIdOrUpn, adminToken, silent);

    const grants = await withAgentSpinner(
      {
        start: 'Fetching granted permissions...',
        success: 'Granted permissions fetched.',
        error: 'Failed to fetch granted permissions.',
      },
      silent,
      () => listDelegatedPermissionGrants(adminToken, identitySpId)
    );

    const entries: AgentUserPermissionEntry[] = [];
    for (const grant of grants) {
      const resourceSp = await getServicePrincipalById(adminToken, grant.resourceId);
      entries.push({
        resourceAppId: resourceSp.appId,
        resourceAppName: resourceAppDisplayName(resourceSp.appId),
        scopes: grant.scope.split(' ').filter((s) => s.length > 0),
      });
    }

    return entries;
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_IDENTITY_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Grants a set of delegated scopes on a resource app directly to an
 * agentic user's agent identity, merging with any scopes already granted
 * for that resource app.
 */
export async function addAgentUserPermissions(
  userIdOrUpn: string,
  account: AccountInfo,
  resourceAppId: string,
  scopes: string[],
  silent: boolean
): Promise<AgentUserPermissionEntry> {
  try {
    const adminToken = await acquireAdminToken(account, silent);
    const identitySpId = await resolveIdentityServicePrincipalId(userIdOrUpn, adminToken, silent);

    const existing = await findDelegatedPermissionGrant(adminToken, identitySpId, resourceAppId);
    const current = existing ? existing.scope.split(' ').filter((s) => s.length > 0) : [];
    const merged = [...new Set([...current, ...scopes])];

    await withAgentSpinner(
      {
        start: `Granting ${resourceAppDisplayName(resourceAppId)} permission(s): ${scopes.join(', ')}...`,
        success: 'Permission(s) granted.',
        error: 'Failed to grant the requested permission(s).',
      },
      silent,
      () => grantDelegatedPermissions(adminToken, identitySpId, resourceAppId, merged)
    );

    return { resourceAppId, resourceAppName: resourceAppDisplayName(resourceAppId), scopes: merged };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_IDENTITY_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}

/** Revoke a set of previously-granted scopes for a resource app from an agentic user's agent identity. */
export async function removeAgentUserPermissions(
  userIdOrUpn: string,
  account: AccountInfo,
  resourceAppId: string,
  scopes: string[],
  silent: boolean
): Promise<AgentUserPermissionEntry> {
  try {
    const adminToken = await acquireAdminToken(account, silent);
    const identitySpId = await resolveIdentityServicePrincipalId(userIdOrUpn, adminToken, silent);

    await withAgentSpinner(
      {
        start: `Revoking ${resourceAppDisplayName(resourceAppId)} permission(s): ${scopes.join(', ')}...`,
        success: 'Permission(s) revoked.',
        error: 'Failed to revoke the requested permission(s).',
      },
      silent,
      () => revokeDelegatedPermissions(adminToken, identitySpId, resourceAppId, scopes)
    );

    const remainingGrant = await findDelegatedPermissionGrant(adminToken, identitySpId, resourceAppId);
    const remaining = remainingGrant ? remainingGrant.scope.split(' ').filter((s) => s.length > 0) : [];

    return { resourceAppId, resourceAppName: resourceAppDisplayName(resourceAppId), scopes: remaining };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_IDENTITY_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Declaratively set a resource app's granted scopes on an agentic user's
 * agent identity to an exact list, granting newly-added scopes and
 * revoking ones no longer present.
 */
export async function setAgentUserPermissions(
  userIdOrUpn: string,
  account: AccountInfo,
  resourceAppId: string,
  scopes: string[],
  silent: boolean
): Promise<AgentUserPermissionEntry> {
  try {
    const adminToken = await acquireAdminToken(account, silent);
    const identitySpId = await resolveIdentityServicePrincipalId(userIdOrUpn, adminToken, silent);

    const existing = await findDelegatedPermissionGrant(adminToken, identitySpId, resourceAppId);
    const current = existing ? existing.scope.split(' ').filter((s) => s.length > 0) : [];
    const toRevoke = current.filter((s) => !scopes.includes(s));

    if (scopes.length > 0) {
      await withAgentSpinner(
        {
          start: `Granting ${resourceAppDisplayName(resourceAppId)} permission(s): ${scopes.join(', ')}...`,
          success: 'Permission(s) granted.',
          error: 'Failed to grant the requested permission(s).',
        },
        silent,
        () => grantDelegatedPermissions(adminToken, identitySpId, resourceAppId, scopes)
      );
    }

    // Only needed when scopes is empty -- the full-replace grant above already drops any
    // scope not in `scopes` otherwise, so revoking toRevoke again would be a no-op.
    if (scopes.length === 0 && toRevoke.length > 0) {
      await withAgentSpinner(
        {
          start: `Revoking ${resourceAppDisplayName(resourceAppId)} permission(s): ${toRevoke.join(', ')}...`,
          success: 'Permission(s) revoked.',
          error: 'Failed to revoke no-longer-requested permission(s).',
        },
        silent,
        () => revokeDelegatedPermissions(adminToken, identitySpId, resourceAppId, toRevoke)
      );
    }

    return { resourceAppId, resourceAppName: resourceAppDisplayName(resourceAppId), scopes };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_IDENTITY_PERMISSIONS_FAILED', error instanceof Error ? error.message : String(error));
  }
}
