import type { AccountInfo } from '@azure/msal-node';
import {
  AGENT365_SERVICE_RESOURCE,
  clearAgentBlueprintMessagingEndpoint,
  setAgentBlueprintMessagingEndpoint,
} from '../../../apps/agent365-service.js';
import {
  addBlueprintSecret,
  configureInheritableResourcePermissions,
  createAgentBlueprint,
  createAgentBlueprintPrincipal,
  deleteApplication,
  deleteServicePrincipal,
  deleteUser,
  findAgentIdentitiesForBlueprint,
  findAgenticUserForIdentity,
  getAadAppByClientId,
  getServicePrincipalByAppId,
  grantAgentIdentityCreateAsManagerRole,
  grantDelegatedPermissions,
  grantSmbaAgentDataPermission,
  MICROSOFT_GRAPH_APP_ID,
  SMBA_APP_ID,
  updateAadApp,
} from '../../../apps/graph.js';
import { getAzAccessToken } from '../../../utils/az.js';
import { CliError } from '../../../utils/errors.js';
import { withAgentSpinner } from '../shared.js';

export interface AgentBlueprintResult {
  agentBlueprintId: string;
  agentBlueprintObjectId: string;
  agentBlueprintServicePrincipalObjectId: string;
  agentBlueprintClientSecret: string;
  /** Microsoft Graph delegated scopes granted and made inheritable, if any were requested. */
  graphPermissions?: string[];
}

/**
 * Creates an agent identity blueprint via Microsoft Graph: the blueprint
 * application, a client secret, and its service principal (the "managed
 * identity"). Uses an admin-delegated token from `az account get-access-token`
 * since the shared public MSAL client isn't consented for the required
 * `AgentIdentityBlueprint.*` permissions.
 *
 * `graphScopes` are additional Graph delegated scopes (e.g. `Mail.ReadWrite`)
 * to grant and make inheritable by every agent identity created from this
 * blueprint.
 */
export async function runCreateAgentBlueprint(
  agentName: string,
  account: AccountInfo,
  silent: boolean,
  graphScopes?: string[]
): Promise<AgentBlueprintResult> {
  try {
    const adminToken = await withAgentSpinner(
      {
        start: 'Acquiring an admin token via Azure CLI...',
        success: 'Admin token acquired.',
        error: 'Could not get an admin token from the Azure CLI.',
      },
      silent,
      () => getAzAccessToken('https://graph.microsoft.com', account.tenantId)
    );

    const blueprint = await withAgentSpinner(
      {
        start: 'Creating agent blueprint...',
        success: 'Agent blueprint created.',
        error: 'Failed to create agent blueprint.',
      },
      silent,
      () =>
        createAgentBlueprint(adminToken, {
          displayName: agentName,
          sponsorObjectId: account.localAccountId,
        })
    );

    const secret = await withAgentSpinner(
      {
        start: 'Generating client secret...',
        success: 'Client secret generated.',
        error: 'Failed to generate client secret.',
      },
      silent,
      () => addBlueprintSecret(adminToken, blueprint.id)
    );

    const principal = await withAgentSpinner(
      {
        start: 'Creating blueprint service principal...',
        success: 'Blueprint service principal created.',
        error: 'Failed to create blueprint service principal.',
      },
      silent,
      () => createAgentBlueprintPrincipal(adminToken, blueprint.appId)
    );

    // Required so `createAgentIdentity` doesn't 401 with Authorization_IdentityNotFound.
    await withAgentSpinner(
      {
        start: 'Granting AgentIdentity.CreateAsManager role...',
        success: 'AgentIdentity.CreateAsManager role granted.',
        error: 'Failed to grant the AgentIdentity.CreateAsManager role.',
      },
      silent,
      () => grantAgentIdentityCreateAsManagerRole(adminToken, principal.id)
    );

    // Required for the agentic user's own messaging traffic, else `invalid_grant` on OBO token exchange.
    await withAgentSpinner(
      {
        start: 'Granting Messaging Bot API AgentData.ReadWrite permission...',
        success: 'Messaging Bot API permission granted.',
        error: 'Failed to grant the Messaging Bot API permission.',
      },
      silent,
      () => grantSmbaAgentDataPermission(adminToken, principal.id)
    );

    // Makes every future agent identity under this blueprint inherit the scope above automatically.
    await withAgentSpinner(
      {
        start: 'Configuring inheritable Messaging Bot API permissions...',
        success: 'Inheritable permissions configured.',
        error: 'Failed to configure inheritable permissions.',
      },
      silent,
      () => configureInheritableResourcePermissions(adminToken, blueprint.id, SMBA_APP_ID, ['AgentData.ReadWrite'])
    );

    // Equivalent of RSC permissions in a Teams app manifest: grants and marks inheritable so every agent identity gets them.
    const dedupedGraphScopes = graphScopes?.length ? [...new Set(graphScopes)] : undefined;
    if (dedupedGraphScopes?.length) {
      await withAgentSpinner(
        {
          start: `Granting Microsoft Graph permission(s): ${dedupedGraphScopes.join(', ')}...`,
          success: 'Microsoft Graph permission(s) granted.',
          error: 'Failed to grant the requested Microsoft Graph permission(s).',
        },
        silent,
        () => grantDelegatedPermissions(adminToken, principal.id, MICROSOFT_GRAPH_APP_ID, dedupedGraphScopes)
      );

      await withAgentSpinner(
        {
          start: 'Configuring inheritable Microsoft Graph permissions...',
          success: 'Inheritable Microsoft Graph permissions configured.',
          error: 'Failed to configure inheritable Microsoft Graph permissions.',
        },
        silent,
        () => configureInheritableResourcePermissions(adminToken, blueprint.id, MICROSOFT_GRAPH_APP_ID, dedupedGraphScopes)
      );
    }

    return {
      agentBlueprintId: blueprint.appId,
      agentBlueprintObjectId: blueprint.id,
      agentBlueprintServicePrincipalObjectId: principal.id,
      agentBlueprintClientSecret: secret.secretText,
      ...(dedupedGraphScopes?.length ? { graphPermissions: dedupedGraphScopes } : {}),
    };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'AGENT_BLUEPRINT_FAILED',
      error instanceof Error ? error.message : String(error),
      'Verify your account has the AgentIdentityBlueprint.Create/AddRemoveCreds.All/AgentIdentityBlueprintPrincipal.Create/AppRoleAssignment.ReadWrite.All/DelegatedPermissionGrant.ReadWrite.All permissions (or an Agent ID Developer/Administrator role), then retry.'
    );
  }
}

export interface AgentBlueprintCleanupTarget {
  agentBlueprintId: string;
  agentBlueprintObjectId: string;
  agentBlueprintServicePrincipalObjectId: string;
}

/**
 * Resolves the object IDs `runDeleteAgentBlueprint` needs for a blueprint ID
 * given on the command line, by looking it up via Graph instead of requiring
 * a local `agent.generated.config.json`.
 */
export async function resolveBlueprintCleanupTarget(
  blueprintId: string,
  account: AccountInfo,
  silent: boolean
): Promise<AgentBlueprintCleanupTarget> {
  try {
    const adminToken = await withAgentSpinner(
      {
        start: 'Acquiring an admin token via Azure CLI...',
        success: 'Admin token acquired.',
        error: 'Could not get an admin token from the Azure CLI.',
      },
      silent,
      () => getAzAccessToken('https://graph.microsoft.com', account.tenantId)
    );

    const app = await withAgentSpinner(
      {
        start: 'Looking up agent blueprint...',
        success: 'Agent blueprint found.',
        error: 'Could not find an agent blueprint with that ID.',
      },
      silent,
      () => getAadAppByClientId(adminToken, blueprintId)
    );

    const principal = await withAgentSpinner(
      {
        start: 'Looking up blueprint service principal...',
        success: 'Blueprint service principal found.',
        error: 'Could not find the blueprint service principal.',
      },
      silent,
      () => getServicePrincipalByAppId(adminToken, blueprintId)
    );

    return {
      agentBlueprintId: blueprintId,
      agentBlueprintObjectId: app.id,
      agentBlueprintServicePrincipalObjectId: principal.id,
    };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'AGENT_BLUEPRINT_NOT_FOUND',
      error instanceof Error ? error.message : String(error),
      'Verify the blueprint ID is correct and your account can read/manage it.'
    );
  }
}

/** Renames an existing agent blueprint's AAD application `displayName`. Graph-level only. */
export async function runRenameAgentBlueprint(
  blueprintId: string,
  account: AccountInfo,
  name: string,
  silent: boolean
): Promise<void> {
  const target = await resolveBlueprintCleanupTarget(blueprintId, account, silent);

  try {
    const adminToken = await withAgentSpinner(
      {
        start: 'Acquiring an admin token via Azure CLI...',
        success: 'Admin token acquired.',
        error: 'Could not get an admin token from the Azure CLI.',
      },
      silent,
      () => getAzAccessToken('https://graph.microsoft.com', account.tenantId)
    );

    await withAgentSpinner(
      {
        start: `Renaming agent blueprint to "${name}"...`,
        success: 'Agent blueprint renamed.',
        error: 'Failed to rename the agent blueprint.',
      },
      silent,
      () => updateAadApp(adminToken, target.agentBlueprintObjectId, { displayName: name })
    );
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('AGENT_BLUEPRINT_FAILED', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Deletes all Agent 365 resources for a blueprint via Microsoft Graph:
 * explicitly deletes each agent identity's user first (cascade deletion
 * doesn't always clean those up), then the blueprint's service principal
 * (defensively, 404s ignored), and best-effort clears its messaging
 * endpoint on the separate Agent 365 service first so a reused blueprint
 * ID doesn't inherit a stale endpoint.
 */
export async function runDeleteAgentBlueprint(
  target: AgentBlueprintCleanupTarget,
  account: AccountInfo,
  silent: boolean
): Promise<void> {
  try {
    const adminToken = await withAgentSpinner(
      {
        start: 'Acquiring an admin token via Azure CLI...',
        success: 'Admin token acquired.',
        error: 'Could not get an admin token from the Azure CLI.',
      },
      silent,
      () => getAzAccessToken('https://graph.microsoft.com', account.tenantId)
    );

    try {
      const serviceToken = await getAzAccessToken(AGENT365_SERVICE_RESOURCE, account.tenantId);
      await clearAgentBlueprintMessagingEndpoint(serviceToken, account.tenantId, target.agentBlueprintId);
    } catch {
      // Best-effort cleanup only -- the Graph deletion below is authoritative.
    }

    await withAgentSpinner(
      {
        start: 'Looking up agent identities and agentic users...',
        success: 'Agent identities and agentic users cleaned up.',
        error: 'Failed to clean up the agent identities/agentic users.',
      },
      silent,
      async () => {
        const identities = await findAgentIdentitiesForBlueprint(adminToken, target.agentBlueprintId);

        for (const identity of identities) {
          const user = await findAgenticUserForIdentity(adminToken, identity.id);
          if (user) await deleteUser(adminToken, user.id);

          await deleteServicePrincipal(adminToken, identity.id);
        }
      }
    );

    await withAgentSpinner(
      {
        start: 'Deleting agent blueprint...',
        success: 'Agent blueprint deleted.',
        error: 'Failed to delete agent blueprint.',
      },
      silent,
      () => deleteApplication(adminToken, target.agentBlueprintObjectId)
    );

    await withAgentSpinner(
      {
        start: 'Deleting blueprint service principal...',
        success: 'Blueprint service principal deleted.',
        error: 'Failed to delete blueprint service principal.',
      },
      silent,
      () => deleteServicePrincipal(adminToken, target.agentBlueprintServicePrincipalObjectId)
    );
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'AGENT_BLUEPRINT_DELETE_FAILED',
      error instanceof Error ? error.message : String(error),
      'Verify your account has permission to delete this application/service principal, then retry.'
    );
  }
}

export function assertHttpsEndpoint(endpoint: string): void {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new CliError(
      'AGENT_ENDPOINT_INVALID',
      `"${endpoint}" is not a valid URL.`,
      'Pass a full HTTPS URL, e.g. https://your-tunnel.devtunnels.ms/api/messages'
    );
  }
  if (url.protocol !== 'https:') {
    throw new CliError(
      'AGENT_ENDPOINT_INVALID',
      `The messaging endpoint must use HTTPS: "${endpoint}"`,
      'Pass a full HTTPS URL, e.g. https://your-tunnel.devtunnels.ms/api/messages'
    );
  }
}

/** Registers/updates an agent blueprint's messaging endpoint via the Agent 365 backend service (not TDP's bot-registration API). */
export async function registerAgentBlueprintEndpoint(
  agentBlueprintId: string,
  tenantId: string,
  endpoint: string,
  silent: boolean
): Promise<void> {
  await withAgentSpinner(
    {
      start: 'Updating messaging endpoint...',
      success: 'Messaging endpoint updated.',
      error: 'Messaging endpoint update failed.',
    },
    silent,
    async () => {
      try {
        const token = await getAzAccessToken(AGENT365_SERVICE_RESOURCE, tenantId);
        await setAgentBlueprintMessagingEndpoint(token, tenantId, agentBlueprintId, endpoint);
      } catch (error) {
        if (error instanceof CliError) throw error;
        throw new CliError(
          'AGENT_ENDPOINT_UPDATE_FAILED',
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}

