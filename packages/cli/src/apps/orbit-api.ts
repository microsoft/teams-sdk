import { CliError } from '../utils/errors.js';
import { apiFetch } from '../utils/http.js';
import { resolveOrbitBaseUrl } from '../utils/orbit-region.js';
import { bumpPatchVersion, stableStringify } from '../utils/version.js';
import type {
  OrbitAppListPage, OrbitAppListSnapshot, OrbitAppResponse, OrbitAppSnapshot, OrbitAppSummary,
  OrbitAppUpdateOptions, OrbitAppUpdateResult, OrbitApplicationManifest, OrbitAuthorization, OrbitBot,
  OrbitJsonObject, OrbitJsonValue, OrbitManifestUpdates, OrbitPatchOperation, OrbitUserSettings, OrbitUserSettingsSnapshot,
} from './orbit-types.js';
import type { AppAuthorization, AppBot, AppDetails, AppSummary } from './types.js';

type JsonValidator = (value: OrbitJsonValue) => boolean;

function isObject(value: unknown): value is OrbitJsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: OrbitJsonValue): value is string {
  return typeof value === 'string';
}

function isStringArray(value: OrbitJsonValue): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function hasNullableFields(object: OrbitJsonObject, fields: readonly string[], validate: JsonValidator): boolean {
  return fields.every(field => object[field] == null || validate(object[field]));
}

function isTextPair(value: OrbitJsonValue): boolean {
  return isObject(value) && hasNullableFields(value, ['short', 'full'], isString);
}

function isBot(value: OrbitJsonValue): boolean {
  return isObject(value)
    && typeof value.botId === 'string' && value.botId.trim().length > 0
    && hasNullableFields(value, ['scopes'], isStringArray)
    && hasNullableFields(value, ['messagingEndpoint'], isString);
}

function isStaticTab(value: OrbitJsonValue): boolean {
  return isObject(value) && typeof value.entityId === 'string'
    && hasNullableFields(value, ['scopes', 'context'], isStringArray)
    && hasNullableFields(value, ['name', 'contentUrl', 'websiteUrl', 'objectId'], isString);
}

function isCopilotAgents(value: OrbitJsonValue): boolean {
  return isObject(value) && hasNullableFields(value, ['customEngineAgents'], agents =>
    Array.isArray(agents) && agents.every(agent =>
      isObject(agent) && typeof agent.type === 'string' && typeof agent.id === 'string'
    )
  );
}

function isAuthorization(value: OrbitJsonValue): boolean {
  return isObject(value) && hasNullableFields(value, ['permissions'], permissions =>
    isObject(permissions) && hasNullableFields(permissions, ['resourceSpecific'], entries =>
      Array.isArray(entries) && entries.every(entry =>
        isObject(entry) && typeof entry.name === 'string'
        && (entry.type === 'Application' || entry.type === 'Delegated')
      )
    )
  );
}

function isAppResponse(value: unknown): value is OrbitAppResponse {
  if (!isObject(value) || typeof value.appId !== 'string' || !value.appId.trim()) return false;
  const profile = value.appProfile;
  if (!isObject(profile) || !isObject(profile.appDetails)) return false;
  const details = profile.appDetails;
  const manifest = details.applicationManifest;
  return isObject(manifest)
    && typeof manifest.id === 'string' && manifest.id.trim().length > 0
    && hasNullableFields(profile, ['appAccessControl', 'appMetadata'], isObject)
    && hasNullableFields(details, ['firstPartySettings'], isObject)
    && hasNullableFields(manifest, ['manifestVersion', 'version', 'accentColor'], isString)
    && hasNullableFields(manifest, ['name', 'description'], isTextPair)
    && hasNullableFields(manifest, ['developer'], developer =>
      isObject(developer)
      && hasNullableFields(developer, ['name', 'websiteUrl', 'privacyUrl', 'termsOfUseUrl', 'mpnId'], isString)
    )
    && hasNullableFields(manifest, ['icons'], icons =>
      isObject(icons) && hasNullableFields(icons, ['color', 'outline'], isString)
    )
    && hasNullableFields(manifest, ['webApplicationInfo'], info =>
      isObject(info) && hasNullableFields(info, ['id', 'resource'], isString)
    )
    && hasNullableFields(manifest, ['validDomains'], isStringArray)
    && hasNullableFields(manifest, ['bots'], bots => Array.isArray(bots) && bots.every(isBot))
    && hasNullableFields(manifest, ['staticTabs'], tabs => Array.isArray(tabs) && tabs.every(isStaticTab))
    && hasNullableFields(manifest, ['copilotAgents'], isCopilotAgents)
    && hasNullableFields(manifest, ['authorization'], isAuthorization);
}

function isAppSummary(value: OrbitJsonValue): boolean {
  return isObject(value)
    && typeof value.appId === 'string' && value.appId.trim().length > 0
    && typeof value.appExternalId === 'string' && value.appExternalId.trim().length > 0
    && hasNullableFields(value, ['appName', 'appVersion', 'updatedAt'], isString);
}

function isAppListPage(value: unknown): value is OrbitAppListPage {
  return isObject(value) && Array.isArray(value.items) && value.items.every(isAppSummary)
    && hasNullableFields(value, ['continuationToken'], isString);
}

function isUserSettings(value: unknown): value is OrbitUserSettings {
  if (!isObject(value) || !isObject(value.tenantSettings)
    || typeof value.tenantSettings.isSideLoadingInteractionEnabled !== 'boolean') return false;
  const policy = value.appPolicyForUser;
  return (policy === null || (isObject(policy) && isObject(policy.value)
    && typeof policy.value.isSideloadingAllowed === 'boolean'
    && typeof policy.value.isUserPinningAllowed === 'boolean'));
}

function decodeBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return text;
  }
}

function errorDetail(body: unknown, text: string): string {
  if (typeof body === 'string') return body.trim();
  if (!isObject(body)) return text.trim();
  if (typeof body.errorMessage === 'string' && body.errorMessage.trim()) {
    const code = typeof body.errorCode === 'string' ? `[${body.errorCode}] ` : '';
    return `${code}${body.errorMessage}`;
  }
  // Keep validation fields alongside the summary rather than discarding model-state errors.
  if (body.errors != null) return text.trim();
  for (const field of ['detail', 'message', 'title']) {
    if (typeof body[field] === 'string' && body[field].trim()) return body[field];
  }
  return text.trim();
}

async function readOrbitBody(
  response: Response,
  resource: 'app' | 'apps' | 'user settings',
  action: 'fetch' | 'update' = 'fetch'
): Promise<unknown> {
  const text = await response.text();
  const body = decodeBody(text);
  if (!response.ok) {
    const detail = errorDetail(body, text);
    const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    throw new CliError(
      'API_ERROR',
      `Failed to ${action} Orbit ${resource}: ${status}${detail ? `: ${detail}` : ''}`,
      action === 'update' && response.status === 412 ? 'Read the latest app definition and try again.' : undefined,
      response.status
    );
  }
  return body;
}

function validateResourceId(resourceId: string): void {
  if (!resourceId.trim()) {
    throw new CliError('VALIDATION_MISSING', 'An Orbit app resource ID is required.');
  }
}

async function readOrbitApp(token: string, resourceId: string, baseUrl: string): Promise<OrbitAppSnapshot> {
  const response = await apiFetch(`${baseUrl}/v1.0/apps/${encodeURIComponent(resourceId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    redirect: 'manual',
  });
  const body = await readOrbitBody(response, 'app');
  if (!isAppResponse(body)) {
    throw new CliError('API_ERROR', 'Invalid Orbit app profile JSON response.', undefined, response.status);
  }
  return { app: body, etag: response.headers.get('ETag') ?? undefined };
}

export async function fetchOrbitApp(token: string, resourceId: string): Promise<OrbitAppSnapshot> {
  validateResourceId(resourceId);
  const region = await resolveOrbitBaseUrl();
  return {
    ...await readOrbitApp(token, resourceId, region.baseUrl),
    ...(region.usedFallback ? { regionFallback: true } : {}),
    ...(region.warning ? { regionWarning: region.warning } : {}),
  };
}

function appendPatchChanges(
  current: OrbitJsonObject,
  changes: OrbitJsonObject,
  path: string,
  operations: OrbitPatchOperation[]
): void {
  for (const [key, value] of Object.entries(changes)) {
    const exists = Object.hasOwn(current, key) && current[key] !== undefined;
    const previous = exists ? current[key] : undefined;
    if (stableStringify(previous) === stableStringify(value)) continue;
    const fieldPath = `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
    if (value === undefined) {
      if (exists) operations.push({ op: 'remove', path: fieldPath });
    } else if (isObject(previous) && isObject(value)) {
      appendPatchChanges(previous, value, fieldPath, operations);
    } else {
      operations.push({ op: exists ? 'replace' : 'add', path: fieldPath, value });
    }
  }
}

export async function updateOrbitApp(
  token: string,
  resourceId: string,
  buildUpdates: (manifest: OrbitApplicationManifest) => OrbitManifestUpdates,
  options?: OrbitAppUpdateOptions
): Promise<OrbitAppUpdateResult> {
  validateResourceId(resourceId);
  const region = await resolveOrbitBaseUrl();
  const snapshot = await readOrbitApp(token, resourceId, region.baseUrl);
  const manifest = snapshot.app.appProfile.appDetails.applicationManifest;
  const changes = buildUpdates(structuredClone(manifest));
  if (!isObject(changes)) {
    throw new CliError('VALIDATION_FORMAT', 'App definition updates must be an object.');
  }
  if (Object.hasOwn(changes, 'id')) {
    throw new CliError('VALIDATION_CONFLICT', 'An app definition update cannot change the manifest ID.');
  }

  const operations: OrbitPatchOperation[] = [];
  appendPatchChanges(manifest, changes, '/applicationManifest', operations);
  const routing = {
    ...(region.usedFallback ? { regionFallback: true as const } : {}),
    ...(region.warning ? { regionWarning: region.warning } : {}),
  };
  if (!operations.length) return { ...snapshot, ...routing, changed: false, versionBumped: false };
  if (!snapshot.etag || !/^"[^"]+"$/.test(snapshot.etag)) {
    throw new CliError('API_ERROR', 'The app response did not contain a usable ETag. Read the app again before updating.');
  }

  let previousVersion: string | undefined;
  if ((options?.autoBumpVersion ?? true) && !Object.hasOwn(changes, 'version') && manifest.version) {
    const bumped = bumpPatchVersion(manifest.version);
    if (bumped) {
      previousVersion = manifest.version;
      operations.push({ op: 'replace', path: '/applicationManifest/version', value: bumped });
    }
  }
  const response = await apiFetch(`${region.baseUrl}/v1.0/apps/${encodeURIComponent(resourceId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json-patch+json',
      'If-Match': snapshot.etag,
    },
    body: JSON.stringify(operations),
    redirect: 'manual',
  });
  const body = await readOrbitBody(response, 'app', 'update');
  if (!isAppResponse(body)) {
    throw new CliError('API_ERROR', 'Invalid Orbit app profile JSON response after update.', undefined, response.status);
  }
  return {
    app: body,
    etag: response.headers.get('ETag') ?? undefined,
    ...routing,
    changed: true,
    versionBumped: previousVersion !== undefined,
    ...(previousVersion !== undefined ? { previousVersion } : {}),
  };
}

export async function fetchOrbitApps(token: string): Promise<OrbitAppListSnapshot> {
  const region = await resolveOrbitBaseUrl();
  const apps: OrbitAppSummary[] = [];
  const seenTokens = new Set<string>();
  let continuationToken: string | undefined;

  do {
    const response = await apiFetch(`${region.baseUrl}/v1.0/apps?pageSize=50`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(continuationToken ? { 'x-ms-continuation': continuationToken } : {}),
      },
      redirect: 'manual',
    });
    const body = await readOrbitBody(response, 'apps');
    if (!isAppListPage(body)) {
      throw new CliError('API_ERROR', 'Invalid Orbit app list JSON response.', undefined, response.status);
    }
    apps.push(...body.items);
    continuationToken = body.continuationToken || undefined;
    if (continuationToken) {
      if (seenTokens.has(continuationToken)) {
        throw new CliError('API_ERROR', 'Orbit returned a repeated continuation token.', undefined, response.status);
      }
      seenTokens.add(continuationToken);
    }
  } while (continuationToken);

  return {
    apps,
    ...(region.usedFallback ? { regionFallback: true } : {}),
    ...(region.warning ? { regionWarning: region.warning } : {}),
  };
}

export function toAppSummary(app: OrbitAppSummary): AppSummary {
  return {
    teamsAppId: app.appId,
    appId: app.appExternalId,
    appName: app.appName ?? null,
    version: app.appVersion ?? null,
    updatedAt: app.updatedAt ?? null,
  };
}

export async function fetchOrbitUserSettings(token: string): Promise<OrbitUserSettingsSnapshot> {
  const region = await resolveOrbitBaseUrl();
  const response = await apiFetch(`${region.baseUrl}/v1.0/users/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    redirect: 'manual',
  });
  const body = await readOrbitBody(response, 'user settings');
  if (!isUserSettings(body)) {
    throw new CliError('API_ERROR', 'Invalid Orbit user settings JSON response.', undefined, response.status);
  }
  return {
    settings: {
      tenantSettings: {
        isSideLoadingInteractionEnabled: body.tenantSettings.isSideLoadingInteractionEnabled,
      },
      appPolicyForUser: body.appPolicyForUser === null ? null : {
        value: {
          isSideloadingAllowed: body.appPolicyForUser.value.isSideloadingAllowed,
          isUserPinningAllowed: body.appPolicyForUser.value.isUserPinningAllowed,
        },
      },
    },
    ...(region.usedFallback ? { regionFallback: true } : {}),
    ...(region.warning ? { regionWarning: region.warning } : {}),
  };
}

function projectBot(bot: OrbitBot): AppBot {
  const { scopes, messagingEndpoint, ...fields } = bot;
  return {
    ...fields,
    ...(scopes != null ? { scopes } : {}),
    ...(messagingEndpoint != null ? { messagingEndpoint } : {}),
  };
}

function projectAuthorization(authorization: OrbitAuthorization): AppAuthorization {
  const { permissions, ...fields } = authorization;
  if (permissions == null) return fields;
  const { resourceSpecific, ...permissionFields } = permissions;
  return {
    ...fields,
    permissions: {
      ...permissionFields,
      ...(resourceSpecific != null ? { resourceSpecific } : {}),
    },
  };
}

/** Read compatibility only: future Orbit writes must use the retained nested app details. */
export function toAppDetails(app: OrbitAppResponse): AppDetails {
  const manifest = structuredClone(app.appProfile.appDetails.applicationManifest);
  return {
    teamsAppId: app.appId,
    appId: manifest.id,
    shortName: manifest.name?.short ?? '',
    longName: manifest.name?.full ?? '',
    shortDescription: manifest.description?.short ?? '',
    longDescription: manifest.description?.full ?? '',
    version: manifest.version ?? '',
    manifestVersion: manifest.manifestVersion ?? '',
    developerName: manifest.developer?.name ?? '',
    websiteUrl: manifest.developer?.websiteUrl ?? '',
    privacyUrl: manifest.developer?.privacyUrl ?? '',
    termsOfUseUrl: manifest.developer?.termsOfUseUrl ?? '',
    mpnId: manifest.developer?.mpnId ?? '',
    accentColor: manifest.accentColor ?? '',
    webApplicationInfoId: manifest.webApplicationInfo?.id ?? '',
    ...(manifest.webApplicationInfo?.resource != null ? { webApplicationInfoResource: manifest.webApplicationInfo.resource } : {}),
    ...(manifest.icons?.color != null ? { colorIcon: manifest.icons.color } : {}),
    ...(manifest.icons?.outline != null ? { outlineIcon: manifest.icons.outline } : {}),
    ...(manifest.validDomains != null ? { validDomains: manifest.validDomains } : {}),
    ...(manifest.bots != null ? { bots: manifest.bots.map(projectBot) } : {}),
    ...(manifest.authorization != null ? { authorization: projectAuthorization(manifest.authorization) } : {}),
  };
}
