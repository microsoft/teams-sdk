import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import type { AppSummary, AppDetails, AppBot } from './types.js';
import { importAppPackage } from './tdp.js';
import { apiFetch } from '../utils/http.js';
import { CliError } from '../utils/errors.js';
import { bumpPatchVersion, stableStringify } from '../utils/version.js';
import { staticsDir } from '../project/paths.js';

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
    throw new CliError(
      'API_ERROR',
      `Failed to download app package: ${response.status} ${response.statusText}`,
      undefined,
      response.status
    );
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

export interface UpdateAppDetailsResult extends AppDetails {
  versionBumped: boolean;
  previousVersion?: string;
}

/**
 * Update app details using the read-modify-write pattern.
 * Fetches current full object, merges updates, and POSTs the full object back.
 * Auto-bumps the patch version when content changes (unless version is explicitly set).
 */
export async function updateAppDetails(
  token: string,
  teamsAppId: string,
  updates: Partial<AppDetails>,
  options?: { autoBumpVersion?: boolean }
): Promise<UpdateAppDetailsResult> {
  // 1. Fetch current full object
  const currentDetails = await fetchAppDetailsV2(token, teamsAppId);

  // 2. Merge updates into it
  const updatedDetails = { ...currentDetails, ...updates };

  // 3. Auto-bump version if content changed and caller didn't set version explicitly
  let versionBumped = false;
  let previousVersion: string | undefined;
  const autoBump = options?.autoBumpVersion ?? true;
  if (autoBump && !('version' in updates) && currentDetails.version) {
    const { version: _cv, ...currentWithoutVersion } = currentDetails;
    const { version: _uv, ...updatedWithoutVersion } = updatedDetails;
    if (stableStringify(currentWithoutVersion) !== stableStringify(updatedWithoutVersion)) {
      const bumped = bumpPatchVersion(currentDetails.version);
      if (bumped) {
        previousVersion = currentDetails.version;
        updatedDetails.version = bumped;
        versionBumped = true;
      }
    }
  }

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
    throw new CliError(
      'API_ERROR',
      `Failed to update app details: ${response.status} ${errorText}`
    );
  }

  const details = (await response.json()) as AppDetails;
  return { ...details, versionBumped, previousVersion };
}

/**
 * Upload an icon to a Teams app via TDP.
 * Two-step process: upload bytes, then write the returned URL back to the app definition.
 */
export async function uploadIcon(
  token: string,
  teamsAppId: string,
  iconType: 'color' | 'outline',
  base64String: string,
  options?: { autoBumpVersion?: boolean }
): Promise<UpdateAppDetailsResult> {
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
    return await updateAppDetails(token, teamsAppId, { [field]: iconUrl }, options);
  } catch (error) {
    if (error instanceof CliError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new CliError('API_ERROR', `Failed to update ${iconType} icon: ${msg}`);
  }
}

/**
 * Create a default app package zip with the given manifest and placeholder icons.
 */
function createDefaultZip(manifestJson: string): Buffer {
  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(manifestJson, 'utf-8'));
  zip.addFile('color.png', fs.readFileSync(path.join(staticsDir, 'color.png')));
  zip.addFile('outline.png', fs.readFileSync(path.join(staticsDir, 'outline.png')));
  return zip.toBuffer();
}

/**
 * Upload a manifest.json to update an existing app.
 * Downloads the current app package (preserving icons), replaces manifest.json,
 * and re-imports via TDP's import endpoint with overwrite.
 */
export async function uploadManifest(
  token: string,
  teamsAppId: string,
  manifestJson: string
): Promise<void> {
  let zipBuffer: Buffer;

  try {
    // Download existing package to preserve icons
    zipBuffer = await downloadAppPackage(token, teamsAppId);
  } catch (error) {
    // Only fall back to default zip on 404 (no existing package)
    if (error instanceof CliError && error.statusCode === 404) {
      await importAppPackage(token, createDefaultZip(manifestJson), true);
      return;
    }
    throw error;
  }

  // Build new zip: copy all entries except manifest.json, then add updated manifest
  const oldZip = new AdmZip(zipBuffer);
  const newZip = new AdmZip();

  for (const entry of oldZip.getEntries()) {
    if (entry.entryName === 'manifest.json') continue;
    newZip.addFile(entry.entryName, entry.getData(), entry.comment, entry.attr);
  }

  newZip.addFile('manifest.json', Buffer.from(manifestJson, 'utf-8'));

  await importAppPackage(token, newZip.toBuffer(), true);
}
