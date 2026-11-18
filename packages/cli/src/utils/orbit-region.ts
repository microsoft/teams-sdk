import type { AccountInfo } from '@azure/msal-node';
import { getAccount, getMsalClient } from '../auth/client.js';
import { readOrbitRegion, writeOrbitRegion } from './config.js';
import { teamsRegionScopes } from '../auth/config.js';
import { CliError } from './errors.js';
import { apiFetch } from './http.js';
import { TDP_HOST, TDP_V2_BASE_URL } from './tdp-host.js';

const DISCOVERY_URL = 'https://teams.microsoft.com/api/authsvc/v1.0/users/region';

interface TeamsRegionResponse {
  regionGtms: {
    teamsDeveloperPortal: string;
  };
}

export interface OrbitRegionResolution {
  baseUrl: string;
  usedFallback?: true;
  warning?: string;
}

function isRegionResponse(value: unknown): value is TeamsRegionResponse {
  return value !== null && typeof value === 'object'
    && 'regionGtms' in value
    && value.regionGtms !== null && typeof value.regionGtms === 'object'
    && 'teamsDeveloperPortal' in value.regionGtms
    && typeof value.regionGtms.teamsDeveloperPortal === 'string';
}

function validateBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new CliError('API_ERROR', 'Region discovery returned an invalid Orbit URL.', undefined, 200);
  }
  // Only trusted Orbit routes may receive the separate TDP bearer token.
  if (url.origin !== TDP_HOST
    || url.username || url.password || url.search || url.hash) {
    throw new CliError('API_ERROR', 'Region discovery returned an unsupported Orbit URL.', undefined, 200);
  }
  return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
}

async function discoverOrbitBaseUrl(account: AccountInfo): Promise<string> {
  let regionToken: string | undefined;
  try {
    const client = await getMsalClient();
    const result = await client.acquireTokenSilent({
      account,
      authority: `https://login.microsoftonline.com/${account.tenantId}`,
      scopes: teamsRegionScopes,
    });
    regionToken = result?.accessToken;
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new CliError(
      'AUTH_TOKEN_FAILED',
      `Failed to acquire a Teams region-discovery token.${detail}`,
      'Sign in with `teams login` and ensure Region.ReadWrite is permitted for the CLI.'
    );
  }
  if (!regionToken) {
    throw new CliError('AUTH_TOKEN_FAILED', 'No Teams region-discovery token was returned.');
  }

  const response = await apiFetch(DISCOVERY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${regionToken}`, Accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new CliError(
      'API_ERROR',
      `Failed to discover the Orbit region: ${response.status}${detail ? ` ${detail}` : ''}`,
      undefined,
      response.status
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new CliError('API_ERROR', 'Invalid region-discovery JSON response.', undefined, response.status);
  }
  if (!isRegionResponse(body)) {
    throw new CliError(
      'API_ERROR', 'Region discovery did not return regionGtms.teamsDeveloperPortal.', undefined, response.status
    );
  }
  return validateBaseUrl(body.regionGtms.teamsDeveloperPortal);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Reuse the signed-in account's saved route, discovering only when no valid matching entry exists. */
export async function resolveOrbitBaseUrl(account?: AccountInfo): Promise<OrbitRegionResolution> {
  const currentAccount = account ?? await getAccount();
  if (!currentAccount) {
    throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
  }
  const warnings: string[] = [];
  try {
    const saved = await readOrbitRegion();
    if (saved?.homeAccountId === currentAccount.homeAccountId
      && saved.tenantId === currentAccount.tenantId && saved.environment === currentAccount.environment) {
      return { baseUrl: validateBaseUrl(saved.baseUrl) };
    }
  } catch (error) {
    warnings.push(`Could not read the saved Orbit region: ${errorMessage(error)}`);
  }
  let baseUrl: string;
  try {
    baseUrl = await discoverOrbitBaseUrl(currentAccount);
  } catch (error) {
    warnings.push(
      `${errorMessage(error)} Using the Americas Orbit endpoint (${TDP_V2_BASE_URL}).`
    );
    return {
      baseUrl: TDP_V2_BASE_URL,
      usedFallback: true,
      warning: warnings.join(' '),
    };
  }

  try {
    await writeOrbitRegion({
      homeAccountId: currentAccount.homeAccountId,
      tenantId: currentAccount.tenantId,
      environment: currentAccount.environment,
      baseUrl,
    });
  } catch (error) {
    warnings.push(`Could not save the Orbit region: ${errorMessage(error)}`);
  }
  return { baseUrl, ...(warnings.length ? { warning: warnings.join(' ') } : {}) };
}
