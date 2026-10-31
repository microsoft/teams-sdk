import { apiFetch } from '../utils/http.js';

function authHeader(token: string): string {
  return 'Bearer ' + token;
}

const AGENT365_SERVICE_BASE_URL = 'https://agent365.svc.cloud.microsoft';

/**
 * Resource/audience for the Agent 365 bot-management service. This is a
 * distinct first-party resource from Microsoft Graph (`graph.microsoft.com`)
 * and from the classic Teams Developer Portal -- a delegated token for it
 * carries the `AgentTools.AgentBluePrint.Create`/`.Delete` scopes, obtained
 * the same way as the Graph admin token elsewhere in this CLI (`az account
 * get-access-token --resource <this>`).
 */
export const AGENT365_SERVICE_RESOURCE = 'ea9ffc3e-8a23-4a7d-836d-234d7c7565c1';

export interface AgentBlueprintBackendConfig {
  agentIdentityBlueprintId: string;
  type: 'apiBased' | 'none';
  callbackUri: string | null;
  message: string;
  timestamp: string;
}

/**
 * Register (or overwrite) the messaging endpoint for an agent blueprint
 * via the real Agent 365 backend service -- the same API the official
 * `a365 setup blueprint --update-endpoint`/`--endpoint-only` commands use.
 * This call is idempotent: calling it again with a new URL simply
 * overwrites the previous callback, no prior delete needed.
 */
export async function setAgentBlueprintMessagingEndpoint(
  token: string,
  tenantId: string,
  agentBlueprintId: string,
  callbackUri: string
): Promise<AgentBlueprintBackendConfig> {
  const response = await apiFetch(`${AGENT365_SERVICE_BASE_URL}/agents/botManagement/createAgentBlueprint`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      TenantId: tenantId,
      AgentIdentityBlueprintId: agentBlueprintId,
      CallbackUri: callbackUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register agent blueprint messaging endpoint: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Clear the messaging endpoint backend configuration for an agent
 * blueprint. 404s are swallowed (already cleared/never registered).
 */
export async function clearAgentBlueprintMessagingEndpoint(
  token: string,
  tenantId: string,
  agentBlueprintId: string
): Promise<void> {
  const response = await apiFetch(`${AGENT365_SERVICE_BASE_URL}/agents/botManagement/deleteAgentBlueprint`, {
    method: 'DELETE',
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      TenantId: tenantId,
      AgentIdentityBlueprintId: agentBlueprintId,
    }),
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to clear agent blueprint messaging endpoint: ${response.status} ${error}`);
  }
}
