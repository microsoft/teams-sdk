import type { AppSummary, AppDetails, AppBot } from './types.js';
import { apiFetch } from '../utils/http.js';
import { CliError } from '../utils/errors.js';

/**
 * Teams app manifest.json structure (subset of fields we care about)
 */
export interface TeamsManifest {
  $schema?: string;
  manifestVersion: string;
  version: string;
  id: string;
  packageName?: string;
  name: { short: string; full?: string };
  description: { short: string; full?: string };
  developer: {
    name: string;
    websiteUrl: string;
    privacyUrl: string;
    termsOfUseUrl: string;
    mpnId?: string;
  };
  accentColor?: string;
  bots?: Array<{
    botId: string;
    scopes?: string[];
    supportsFiles?: boolean;
    isNotificationOnly?: boolean;
  }>;
  staticTabs?: unknown[];
  configurableTabs?: unknown[];
  composeExtensions?: unknown[];
  permissions?: string[];
  validDomains?: string[];
  webApplicationInfo?: {
    id?: string;
    resource?: string;
  };
  [key: string]: unknown;
}

const TDP_BASE_URL = 'https://dev.teams.microsoft.com/api';

const TDP_PAGE_SIZE = 15;

// ── Tenant / user settings ──────────────────────────────────────────────

export interface TenantSettings {
  isSideLoadingInteractionEnabled?: boolean;
}

export interface UserAppPolicy {
  value?: {
    isSideloadingAllowed?: boolean;
    isUserPinningAllowed?: boolean;
  };
}

export async function fetchTenantSettings(token: string): Promise<TenantSettings> {
  const response = await apiFetch(`${TDP_BASE_URL}/usersettings/v2/tenantSettings`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new CliError(
      'API_ERROR',
      `Failed to fetch tenant settings: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

export async function fetchUserAppPolicy(token: string): Promise<UserAppPolicy> {
  const response = await apiFetch(`${TDP_BASE_URL}/usersettings/appPolicyForUser`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new CliError(
      'API_ERROR',
      `Failed to fetch user app policy: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

export async function fetchApps(token: string): Promise<AppSummary[]> {
  const allApps: AppSummary[] = [];
  let pageNumber = 1;

  while (true) {
    const response = await apiFetch(`${TDP_BASE_URL}/appdefinitions/my?pageNumber=${pageNumber}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new CliError('API_ERROR', `Failed to fetch apps: ${response.status} ${errorText}`);
    }

    const page: AppSummary[] = await response.json();
    allApps.push(...page);

    if (page.length < TDP_PAGE_SIZE) break;
    pageNumber++;
  }

  return allApps;
}

export async function fetchApp(token: string, id: string): Promise<AppSummary> {
  const response = await apiFetch(`${TDP_BASE_URL}/appdefinitions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch app: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function downloadAppPackage(token: string, appId: string): Promise<Buffer> {
  const response = await apiFetch(`${TDP_BASE_URL}/appdefinitions/${appId}/manifest`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download app package: ${response.status} ${response.statusText}`);
  }

  // Response is a JSON-encoded base64 string (with quotes)
  const base64String = await response.json();
  return Buffer.from(base64String, 'base64');
}

/**
 * Fetch full app details using the v2 API endpoint.
 * Returns all editable fields plus internal properties that must be preserved on update.
 */
export async function fetchAppDetailsV2(token: string, teamsAppId: string): Promise<AppDetails> {
  const response = await apiFetch(`${TDP_BASE_URL}/appdefinitions/v2/${teamsAppId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch app details: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update app details using the read-modify-write pattern.
 * Fetches current full object, merges updates, and POSTs the full object back.
 */
export async function updateAppDetails(
  token: string,
  teamsAppId: string,
  updates: Partial<AppDetails>
): Promise<AppDetails> {
  // 1. Fetch current full object
  const currentDetails = await fetchAppDetailsV2(token, teamsAppId);

  // 2. Merge updates into it
  const updatedDetails = { ...currentDetails, ...updates };

  // 3. POST full object back
  const response = await apiFetch(`${TDP_BASE_URL}/appdefinitions/v2/${teamsAppId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedDetails),
  });

  if (!response.ok) {
    throw new Error(`Failed to update app details: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Transform a Teams manifest.json to AppDetails format for API upload.
 */
function manifestToAppDetails(manifest: TeamsManifest): Partial<AppDetails> {
  const details: Partial<AppDetails> = {
    appId: manifest.id,
    manifestVersion: manifest.manifestVersion,
    version: manifest.version,
    shortName: manifest.name.short,
    longName: manifest.name.full ?? manifest.name.short,
    shortDescription: manifest.description.short,
    longDescription: manifest.description.full ?? manifest.description.short,
    developerName: manifest.developer.name,
    websiteUrl: manifest.developer.websiteUrl,
    privacyUrl: manifest.developer.privacyUrl,
    termsOfUseUrl: manifest.developer.termsOfUseUrl,
  };

  if (manifest.developer.mpnId) {
    details.mpnId = manifest.developer.mpnId;
  }

  if (manifest.accentColor) {
    details.accentColor = manifest.accentColor;
  }

  if (manifest.bots) {
    details.bots = manifest.bots.map((bot) => ({
      botId: bot.botId,
      scopes: bot.scopes,
    }));
  }

  if (manifest.webApplicationInfo?.id) {
    details.webApplicationInfoId = manifest.webApplicationInfo.id;
  }

  // Pass through other manifest fields that map directly
  const passthroughFields = [
    'staticTabs',
    'configurableTabs',
    'composeExtensions',
    'permissions',
    'validDomains',
    'devicePermissions',
    'activities',
    'meetingExtensionDefinition',
    'authorization',
    'localizationInfo',
  ];

  for (const field of passthroughFields) {
    if (manifest[field] !== undefined) {
      details[field] = manifest[field];
    }
  }

  return details;
}

/**
 * Upload an icon to a Teams app via TDP.
 * Two-step process: upload bytes, then write the returned URL back to the app definition.
 */
export async function uploadIcon(
  token: string,
  teamsAppId: string,
  iconType: 'color' | 'outline',
  base64String: string
): Promise<void> {
  // Step 1: Upload icon bytes
  const uploadResponse = await apiFetch(`${TDP_BASE_URL}/appdefinitions/${teamsAppId}/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: iconType,
      name: '',
      base64String,
    }),
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new CliError(
      'API_ERROR',
      `Failed to upload ${iconType} icon: ${uploadResponse.status} ${error}`
    );
  }

  const iconUrl: string = await uploadResponse.json();

  // Step 2: Write URL back to app definition (read-modify-write to preserve the other icon)
  const field = iconType === 'color' ? 'colorIcon' : 'outlineIcon';
  try {
    await updateAppDetails(token, teamsAppId, { [field]: iconUrl });
  } catch (error) {
    if (error instanceof CliError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new CliError('API_ERROR', `Failed to update ${iconType} icon: ${msg}`);
  }
}

/**
 * Upload a manifest.json to update an existing app.
 * Uses read-modify-write pattern to preserve server-side fields.
 */
export async function uploadManifest(
  token: string,
  teamsAppId: string,
  manifest: TeamsManifest
): Promise<AppDetails> {
  // 1. Fetch current app details to preserve server-only fields (icons, etc.)
  const currentDetails = await fetchAppDetailsV2(token, teamsAppId);

  // 2. Transform manifest to AppDetails format
  const manifestDetails = manifestToAppDetails(manifest);

  // 3. Merge: manifest fields override, but preserve server-only fields
  const updatedDetails = { ...currentDetails, ...manifestDetails };

  // 4. POST full object back
  const response = await apiFetch(`${TDP_BASE_URL}/appdefinitions/v2/${teamsAppId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedDetails),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to upload manifest: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  return response.json();
}
