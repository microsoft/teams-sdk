import { apiFetch } from '../utils/http.js';

function authHeader(token: string): string {
  return 'Bearer ' + token;
}

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
// Agent identity / agentic user resources (agentIdentity servicePrincipals,
// the agentUser @odata.type on /users) are beta-only Graph APIs.
const GRAPH_BETA_BASE_URL = 'https://graph.microsoft.com/beta';

/** appId of the Microsoft Graph service principal -- fixed across every tenant. */
const MICROSOFT_GRAPH_APP_ID = '00000003-0000-0000-c000-000000000000';

/**
 * `id` of Microsoft Graph's `AgentIdentity.CreateAsManager` app role --
 * fixed across every tenant (app role IDs are part of the app's own
 * definition, not provisioned per tenant). A blueprint's service principal
 * needs this role granted on itself before it can authenticate as its own
 * agent blueprint and create agent identities; without it,
 * `createAgentIdentity` 401s with `Authorization_IdentityNotFound`.
 */
const AGENT_IDENTITY_CREATE_AS_MANAGER_APP_ROLE_ID = '4c390976-b2b7-42e0-9187-c6be3bead001';

/** appId of the Messaging Bot API (SMBA) service principal -- fixed across every tenant. */
const SMBA_APP_ID = '5a807f24-c9de-44ee-a3a7-329e88a00ffc';

export interface AadApp {
  id: string;
  appId: string;
  displayName: string;
}

export interface ClientSecret {
  secretText: string;
  displayName: string;
  endDateTime: string;
}

export async function createAadApp(token: string, displayName: string): Promise<AadApp> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/applications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName,
      signInAudience: 'AzureADMultipleOrgs',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create AAD app: ${response.status} ${error}`);
  }

  return response.json();
}

export async function getAadAppByClientId(token: string, clientId: string): Promise<AadApp> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/applications?$filter=appId eq '${clientId}'`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to look up AAD app: ${response.status} ${error}`);
  }

  const data = (await response.json()) as { value: AadApp[] };
  if (data.value.length === 0) {
    throw new Error(`No AAD app found with clientId ${clientId}`);
  }

  return data.value[0];
}

/**
 * Look up an application's service principal ("managed identity") object
 * ID by its `appId`. Used to recover a blueprint's service principal ID
 * when resolving an existing blueprint by ID (e.g. `teams agent user
 * create <blueprintId>` run outside the folder that originally created it).
 */
export async function getServicePrincipalByAppId(token: string, appId: string): Promise<{ id: string }> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/servicePrincipals?$filter=appId eq '${appId}'`, {
    headers: { Authorization: authHeader(token) },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to look up service principal: ${response.status} ${error}`);
  }

  const data = (await response.json()) as { value: { id: string }[] };
  if (data.value.length === 0) {
    throw new Error(`No service principal found for appId ${appId}`);
  }

  return data.value[0];
}

/**
 * Get the full AAD application object by Graph object ID.
 * Returns all fields (unlike getAadAppByClientId which returns a subset).
 */
export async function getAadAppFull(
  token: string,
  appObjectId: string
): Promise<Record<string, unknown>> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/applications/${appObjectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get AAD app: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * PATCH an AAD application with partial updates.
 */
export async function updateAadApp(
  token: string,
  appObjectId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/applications/${appObjectId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update AAD app: ${response.status} ${error}`);
  }
}

export async function createClientSecret(
  token: string,
  appRegistrationId: string
): Promise<ClientSecret> {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 2);

  const response = await apiFetch(
    `${GRAPH_BASE_URL}/applications/${appRegistrationId}/addPassword`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        passwordCredential: {
          displayName: 'default',
          endDateTime: expiryDate.toISOString(),
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create client secret: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * A freshly minted client secret (or a freshly assigned app role) can take
 * a few seconds to replicate across Entra ID before it's usable for a
 * token request -- until it does, `AADSTS7000215: Invalid client secret
 * provided` is returned even though the secret value is correct. Retrying
 * with backoff a few times works around this, rather than failing the
 * whole `teams agent user create` run on what's usually a transient race.
 */
const BLUEPRINT_TOKEN_RETRY_DELAYS_MS = [2000, 4000, 8000];

/**
 * Exchange an agent blueprint's own client ID/secret for an app-only Graph
 * token via the client-credentials flow. This token carries the
 * `AgentIdentity.CreateAsManager` role and is what's needed to create the
 * agent identity itself -- but it is not authorized to create the agentic
 * user (that call needs a human/admin-delegated token instead).
 */
export async function getBlueprintToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  let lastError = '';

  for (let attempt = 0; attempt <= BLUEPRINT_TOKEN_RETRY_DELAYS_MS.length; attempt++) {
    const response = await apiFetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { access_token: string };
      return data.access_token;
    }

    lastError = await response.text();
    // AADSTS7000215 right after minting a secret is almost always
    // replication lag, not a genuinely wrong secret -- retry. Any other
    // error (wrong client ID, tenant mismatch, etc.) fails immediately.
    const isReplicationLag = lastError.includes('AADSTS7000215');
    const delay = BLUEPRINT_TOKEN_RETRY_DELAYS_MS[attempt];
    if (!isReplicationLag || delay === undefined) {
      throw new Error(`Failed to authenticate as the agent blueprint: ${response.status} ${lastError}`);
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(`Failed to authenticate as the agent blueprint: ${lastError}`);
}

export interface CreateAgentIdentityParams {
  displayName: string;
  agentIdentityBlueprintId: string;
  /** Object ID of the sponsoring user (`sponsors@odata.bind`). */
  sponsorObjectId: string;
}

export interface AgentIdentity {
  id: string;
}

/**
 * Create the agent identity service principal for a blueprint, using the
 * blueprint's own client-credentials token. Unlike the agentic user below,
 * this call is authorized for the blueprint's app-only token.
 */
export async function createAgentIdentity(
  blueprintToken: string,
  params: CreateAgentIdentityParams
): Promise<AgentIdentity> {
  const response = await apiFetch(`${GRAPH_BETA_BASE_URL}/servicePrincipals/microsoft.graph.agentIdentity`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${blueprintToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName: params.displayName,
      agentIdentityBlueprintId: params.agentIdentityBlueprintId,
      'sponsors@odata.bind': [`${GRAPH_BASE_URL}/users/${params.sponsorObjectId}`],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create agent identity: ${response.status} ${error}`);
  }

  return response.json();
}

export interface CreateAgenticUserParams {
  displayName: string;
  mailNickname: string;
  userPrincipalName: string;
  /** Object ID of the agent identity (`AgentIdentity.id`) returned by `createAgentIdentity`. */
  identityParentId: string;
  usageLocation: string;
}

export interface AgenticUser {
  id: string;
}

/**
 * Create the Entra agentic user tied to an agent identity. Requires a
 * human/admin-delegated token (e.g. via `az account get-access-token`) --
 * the blueprint's own client-credentials token is not authorized for this
 * call and returns 403.
 */
export async function createAgenticUser(
  adminToken: string,
  params: CreateAgenticUserParams
): Promise<AgenticUser> {
  // The real `a365` CLI creates this via the derived-type URL segment
  // (`/beta/users/microsoft.graph.agentUser`) rather than a plain
  // `/beta/users` POST with an `@odata.type` body field -- matching that
  // exact route here for parity, even though both are valid Graph forms.
  const response = await apiFetch(`${GRAPH_BETA_BASE_URL}/users/microsoft.graph.agentUser`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accountEnabled: true,
      displayName: params.displayName,
      mailNickname: params.mailNickname,
      userPrincipalName: params.userPrincipalName,
      identityParentId: params.identityParentId,
      usageLocation: params.usageLocation,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create agentic user: ${response.status} ${error}`);
  }

  return response.json();
}

export interface AgentBlueprint {
  id: string;
  appId: string;
  displayName: string;
}

export interface CreateAgentBlueprintParams {
  displayName: string;
  /** Object ID of the sponsoring user (`sponsors@odata.bind`). A sponsor is required. */
  sponsorObjectId: string;
}

/**
 * Create an agent identity blueprint (the template used to create agent
 * identities). Sponsored (and owned) by the signed-in `teams login` account.
 * Requires the delegated `AgentIdentityBlueprint.Create` permission -- not
 * something the shared public MSAL client has, so this needs an
 * admin-delegated token (e.g. via `az account get-access-token`), same as
 * `createAgenticUser`.
 */
export async function createAgentBlueprint(
  token: string,
  params: CreateAgentBlueprintParams
): Promise<AgentBlueprint> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/applications/microsoft.graph.agentIdentityBlueprint`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
      'OData-Version': '4.0',
    },
    body: JSON.stringify({
      displayName: params.displayName,
      'sponsors@odata.bind': [`${GRAPH_BASE_URL}/users/${params.sponsorObjectId}`],
      'owners@odata.bind': [`${GRAPH_BASE_URL}/users/${params.sponsorObjectId}`],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create agent blueprint: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Add a password credential to an agent identity blueprint, returning the
 * plaintext client secret (only ever returned once). Requires the
 * delegated `AgentIdentityBlueprint.AddRemoveCreds.All` permission.
 */
export async function addBlueprintSecret(token: string, blueprintObjectId: string): Promise<ClientSecret> {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 2);

  const response = await apiFetch(`${GRAPH_BASE_URL}/applications/${blueprintObjectId}/addPassword`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
      'OData-Version': '4.0',
    },
    body: JSON.stringify({
      passwordCredential: {
        displayName: 'default',
        endDateTime: expiryDate.toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add blueprint client secret: ${response.status} ${error}`);
  }

  return response.json();
}

export interface AgentBlueprintPrincipal {
  id: string;
}

/**
 * Create the agent identity blueprint principal (the blueprint's service
 * principal/"managed identity"), used both as the blueprint's app-facing
 * identity and as a required step before agent identities become fully
 * usable. Requires the delegated `AgentIdentityBlueprintPrincipal.Create`
 * permission.
 */
export async function createAgentBlueprintPrincipal(
  token: string,
  appId: string
): Promise<AgentBlueprintPrincipal> {
  const response = await apiFetch(
    `${GRAPH_BASE_URL}/serviceprincipals/microsoft.graph.agentIdentityBlueprintPrincipal`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader(token),
        'Content-Type': 'application/json',
        'OData-Version': '4.0',
      },
      body: JSON.stringify({ appId }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create agent blueprint principal: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Grant a blueprint's own service principal the `AgentIdentity.CreateAsManager`
 * app role on Microsoft Graph. Without this, the blueprint can mint a valid
 * client-credentials token, but using it to create an agent identity 401s
 * with `Authorization_IdentityNotFound` -- the role is what actually
 * authorizes the blueprint to act as itself. Requires the delegated
 * `AppRoleAssignment.ReadWrite.All` permission.
 */
export async function grantAgentIdentityCreateAsManagerRole(
  token: string,
  blueprintServicePrincipalId: string
): Promise<void> {
  const graphSp = await getServicePrincipalByAppId(token, MICROSOFT_GRAPH_APP_ID);

  const response = await apiFetch(`${GRAPH_BASE_URL}/servicePrincipals/${blueprintServicePrincipalId}/appRoleAssignments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      principalId: blueprintServicePrincipalId,
      resourceId: graphSp.id,
      appRoleId: AGENT_IDENTITY_CREATE_AS_MANAGER_APP_ROLE_ID,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to grant AgentIdentity.CreateAsManager role: ${response.status} ${error}`);
  }
}

/**
 * Grant the blueprint's service principal the Messaging Bot API's
 * (SMBA) `AgentData.ReadWrite` delegated scope, consented tenant-wide
 * (`AllPrincipals`). Without this, the agentic user's on-behalf-of token
 * exchange used to post/reply to conversations fails with `invalid_grant`
 * even though `AgentIdentity.CreateAsManager` (a separate, unrelated
 * role) is already granted -- that role only authorizes creating the
 * agent identity itself, not the agentic user's messaging traffic.
 * Requires the delegated `DelegatedPermissionGrant.ReadWrite.All`
 * permission.
 */
export async function grantSmbaAgentDataPermission(token: string, blueprintServicePrincipalId: string): Promise<void> {
  const smbaSp = await getServicePrincipalByAppId(token, SMBA_APP_ID);

  const response = await apiFetch(`${GRAPH_BASE_URL}/oauth2PermissionGrants`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: blueprintServicePrincipalId,
      consentType: 'AllPrincipals',
      resourceId: smbaSp.id,
      scope: 'AgentData.ReadWrite',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to grant the Messaging Bot API AgentData.ReadWrite permission: ${response.status} ${error}`);
  }
}

/**
 * Delete an agent identity blueprint application by its Graph object ID.
 * Deleting the blueprint cascades: Microsoft Entra automatically cleans up
 * all child agent identities and their agents' user accounts, so this is
 * the only delete call `teams agent blueprint delete` needs for those. 404s are
 * swallowed (already deleted).
 */
/**
 * Find the agent identity service principal (if any) created under a
 * blueprint. Cascade deletion of a blueprint is async and best-effort --
 * per Microsoft's own docs, agents' user accounts in particular "aren't
 * [always] automatically cleaned up as part of cascade deletion" -- so
 * `teams agent blueprint delete` looks this up itself and deletes it
 * explicitly rather than relying on the cascade to have already run.
 */
export async function findAgentIdentityForBlueprint(
  token: string,
  blueprintId: string
): Promise<{ id: string } | undefined> {
  const response = await apiFetch(
    `${GRAPH_BETA_BASE_URL}/servicePrincipals/microsoft.graph.agentIdentity?$filter=agentIdentityBlueprintId eq '${blueprintId}'&$count=true`,
    {
      headers: { Authorization: authHeader(token), ConsistencyLevel: 'eventual' },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to look up the blueprint's agent identity: ${response.status} ${error}`);
  }

  const data = (await response.json()) as { value: { id: string }[] };
  return data.value[0];
}

/** Find the agentic user (if any) provisioned for an agent identity. */
export async function findAgenticUserForIdentity(
  token: string,
  agentIdentityId: string
): Promise<{ id: string } | undefined> {
  const response = await apiFetch(
    `${GRAPH_BETA_BASE_URL}/users/microsoft.graph.agentUser?$filter=identityParentId eq '${agentIdentityId}'&$count=true`,
    {
      headers: { Authorization: authHeader(token), ConsistencyLevel: 'eventual' },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to look up the agent identity's agentic user: ${response.status} ${error}`);
  }

  const data = (await response.json()) as { value: { id: string }[] };
  return data.value[0];
}

/**
 * Look up an agentic user directly by its object ID or UPN, returning the
 * object ID of its parent agent identity (`identityParentId`) alongside
 * its own. Used by `teams agent user delete <userIdOrUpn>` so a specific
 * agentic user (and its identity) can be targeted without first having to
 * know which blueprint created it. Returns undefined on a 404 (not
 * found/already deleted).
 */
export async function getAgenticUserByIdOrUpn(
  token: string,
  userIdOrUpn: string
): Promise<{ id: string; identityParentId: string } | undefined> {
  const response = await apiFetch(
    `${GRAPH_BETA_BASE_URL}/users/${encodeURIComponent(userIdOrUpn)}/microsoft.graph.agentUser?$select=id,identityParentId`,
    {
      headers: { Authorization: authHeader(token) },
    }
  );

  if (response.status === 404) return undefined;
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to look up agentic user: ${response.status} ${error}`);
  }

  return response.json();
}

/** Delete an agentic user by its Graph object ID. 404s are swallowed (already deleted). */
export async function deleteUser(token: string, userObjectId: string): Promise<void> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/users/${userObjectId}`, {
    method: 'DELETE',
    headers: { Authorization: authHeader(token) },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete agentic user: ${response.status} ${error}`);
  }
}

export async function deleteApplication(token: string, appObjectId: string): Promise<void> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/applications/${appObjectId}`, {
    method: 'DELETE',
    headers: { Authorization: authHeader(token) },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete agent blueprint: ${response.status} ${error}`);
  }
}

/**
 * Delete a service principal by its Graph object ID. Used defensively
 * after `deleteApplication` to clean up the blueprint's own service
 * principal in case the cascade delete doesn't cover it. 404s are
 * swallowed (already deleted).
 */
export async function deleteServicePrincipal(token: string, spObjectId: string): Promise<void> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/serviceprincipals/${spObjectId}`, {
    method: 'DELETE',
    headers: { Authorization: authHeader(token) },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete service principal: ${response.status} ${error}`);
  }
}

export interface OrganizationInfo {
  /** Tenant's default verified domain (e.g. `contoso.onmicrosoft.com`), used to build the agentic user's UPN. */
  defaultDomain?: string;
  /** Tenant's default country/region code (e.g. `US`), used as the agentic user's `usageLocation`. */
  countryLetterCode?: string;
}

/**
 * Look up the tenant's default verified domain and country code, used to
 * derive the agentic user's UPN and `usageLocation` without prompting for
 * them when they can be discovered automatically.
 */
export async function getOrganizationInfo(token: string): Promise<OrganizationInfo> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/organization?$select=verifiedDomains,countryLetterCode`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to look up tenant organization info: ${response.status} ${error}`);
  }

  const data = (await response.json()) as {
    value: Array<{ verifiedDomains?: Array<{ name: string; isDefault?: boolean }>; countryLetterCode?: string }>;
  };
  const org = data.value[0];
  const defaultDomain = org?.verifiedDomains?.find((d) => d.isDefault)?.name ?? org?.verifiedDomains?.[0]?.name;
  return {
    ...(defaultDomain ? { defaultDomain } : {}),
    ...(org?.countryLetterCode ? { countryLetterCode: org.countryLetterCode } : {}),
  };
}

export interface SubscribedSku {
  skuId: string;
  skuPartNumber: string;
  /** Total purchased seats for this SKU. */
  enabledUnits: number;
  consumedUnits: number;
}

/**
 * List all of a tenant's subscribed SKUs (e.g. `AGENT_365`, `ENTERPRISEPACK`),
 * used to let the user pick which license to assign to a freshly created
 * agentic user -- there's no single fixed SKU that works across tenants
 * (the exact license a tenant has varies), so the caller presents this
 * list instead of assuming one.
 */
export async function listSubscribedSkus(token: string): Promise<SubscribedSku[]> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/subscribedSkus`, {
    headers: { Authorization: authHeader(token) },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to look up subscribed SKUs: ${response.status} ${error}`);
  }

  const data = (await response.json()) as {
    value: Array<{
      skuId: string;
      skuPartNumber: string;
      consumedUnits: number;
      prepaidUnits?: { enabled?: number };
    }>;
  };

  return data.value.map((sku) => ({
    skuId: sku.skuId,
    skuPartNumber: sku.skuPartNumber,
    enabledUnits: sku.prepaidUnits?.enabled ?? 0,
    consumedUnits: sku.consumedUnits,
  }));
}

/**
 * Assign a license SKU to a user via `POST /users/{id}/assignLicense`.
 * `usageLocation` must already be set on the user (it's a required
 * precondition for license assignment, and `createAgenticUser` always
 * sets it).
 */
export async function assignLicense(token: string, userId: string, skuId: string): Promise<void> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/users/${userId}/assignLicense`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      addLicenses: [{ skuId, disabledPlans: [] }],
      removeLicenses: [],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to assign license: ${response.status} ${error}`);
  }
}
