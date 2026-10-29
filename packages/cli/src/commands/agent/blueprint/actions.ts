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
  findAgentIdentityForBlueprint,
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
 * Create an agent identity blueprint directly via Microsoft Graph: the
 * blueprint application (sponsored/owned by the signed-in `teams login`
 * account), a client secret for it, and its service principal (the
 * "managed identity"/blueprint principal). Mirrors the manual flow
 * documented at https://learn.microsoft.com/entra/agent-id/create-blueprint.
 *
 * Needs the delegated `AgentIdentityBlueprint.Create` /
 * `AgentIdentityBlueprint.AddRemoveCreds.All` /
 * `AgentIdentityBlueprintPrincipal.Create` permissions -- not something the
 * shared public MSAL client is consented for, so this shells out to
 * `az account get-access-token` for an admin-delegated token, the same
 * pattern already used for agentic user creation.
 *
 * `graphScopes` is the equivalent of a Teams app manifest's RSC
 * permissions list: additional Microsoft Graph delegated scopes (e.g.
 * `Mail.ReadWrite`, `Chat.ReadWrite`) to grant on the blueprint and
 * configure as inheritable, so every agent identity created from it gets
 * them automatically. Omit it for a blueprint with no Graph data access
 * beyond core messaging.
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

    // Required before the blueprint can authenticate as itself to create
    // agent identities -- without it, `createAgentIdentity` 401s with
    // `Authorization_IdentityNotFound` even with a valid client-credentials
    // token.
    await withAgentSpinner(
      {
        start: 'Granting AgentIdentity.CreateAsManager role...',
        success: 'AgentIdentity.CreateAsManager role granted.',
        error: 'Failed to grant the AgentIdentity.CreateAsManager role.',
      },
      silent,
      () => grantAgentIdentityCreateAsManagerRole(adminToken, principal.id)
    );

    // Required for the agentic user's own messaging traffic -- without
    // this, posting/replying as the agentic user fails with `invalid_grant`
    // during the on-behalf-of token exchange, even though the role above
    // is already granted (that role only covers creating the agent
    // identity itself, not sending/receiving messages as the agentic user).
    await withAgentSpinner(
      {
        start: 'Granting Messaging Bot API AgentData.ReadWrite permission...',
        success: 'Messaging Bot API permission granted.',
        error: 'Failed to grant the Messaging Bot API permission.',
      },
      silent,
      () => grantSmbaAgentDataPermission(adminToken, principal.id)
    );

    // Makes every future agent identity created under this blueprint
    // automatically inherit the Messaging Bot API scope above, instead of
    // needing a separate `grantSmbaAgentDataPermission` call per identity.
    await withAgentSpinner(
      {
        start: 'Configuring inheritable Messaging Bot API permissions...',
        success: 'Inheritable permissions configured.',
        error: 'Failed to configure inheritable permissions.',
      },
      silent,
      () => configureInheritableResourcePermissions(adminToken, blueprint.id, SMBA_APP_ID, ['AgentData.ReadWrite'])
    );

    // Equivalent of declaring RSC permissions in a Teams app manifest:
    // explicitly-requested Microsoft Graph scopes (e.g. `Mail.ReadWrite`)
    // are granted on the blueprint and marked inheritable so every agent
    // identity created from it gets them automatically, without a
    // per-identity grant step.
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
 * Resolve the object IDs `runDeleteAgentBlueprint` needs for a blueprint ID
 * given directly on the command line, by looking it up via Graph instead of
 * requiring a local `agent.generated.config.json`. Used by `teams agent
 * blueprint delete <blueprintId>` so it can delete a blueprint from any
 * folder, not just the one that originally created it.
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

/**
 * Rename an existing agent blueprint (its AAD application's
 * `displayName`). This is purely a Graph-level change -- it doesn't
 * affect the blueprint's ID, secret, service principal, or any Teams app
 * package already created for it.
 */
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
 * Delete ALL Agent 365 resources for a blueprint via Microsoft Graph.
 * Cascade deletion of a blueprint is async and best-effort -- per
 * Microsoft's own docs, agents' user accounts in particular aren't always
 * automatically cleaned up as part of it -- so this looks up and deletes
 * the blueprint's agent identity and agentic user explicitly first,
 * instead of assuming the cascade already ran. The blueprint's own
 * service principal is deleted defensively afterward in case the cascade
 * doesn't cover it either (404s are ignored). Its messaging endpoint
 * backend configuration (on the separate Agent 365 service) is also
 * cleared best-effort first, so a reused blueprint ID doesn't inherit a
 * stale endpoint -- failures here don't block the Graph deletion.
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
        start: 'Looking up agent identity and agentic user...',
        success: 'Agent identity and agentic user cleaned up.',
        error: 'Failed to clean up the agent identity/agentic user.',
      },
      silent,
      async () => {
        const identity = await findAgentIdentityForBlueprint(adminToken, target.agentBlueprintId);
        if (!identity) return;

        const user = await findAgenticUserForIdentity(adminToken, identity.id);
        if (user) await deleteUser(adminToken, user.id);

        await deleteServicePrincipal(adminToken, identity.id);
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

/**
 * Registers/updates the messaging endpoint for an agent blueprint via the
 * real Agent 365 backend service (`agent365.svc.cloud.microsoft`) -- the
 * same API the official `a365 setup blueprint` CLI uses. The classic Teams
 * Developer Portal bot-registration API (used for regular Teams bots) does
 * NOT apply here: Agent 365 blueprints track their messaging endpoint in
 * this separate service, not in TDP's bot records. Shared by `teams agent
 * blueprint update` and the optional endpoint prompt in `teams agent
 * blueprint create`.
 */
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

