import { CliError } from '../utils/errors.js';
import { apiFetch } from '../utils/http.js';
import { resolveOrbitBaseUrl } from '../utils/orbit-region.js';
import type {
  OrbitAppListPage, OrbitAppListSnapshot, OrbitAppResponse, OrbitAppSnapshot, OrbitAppSummary,
  OrbitAuthorization, OrbitBot, OrbitJsonObject, OrbitJsonValue, OrbitUserSettings, OrbitUserSettingsSnapshot,
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

async function readOrbitBody(response: Response, resource: 'app' | 'apps' | 'user settings'): Promise<unknown> {
  const text = await response.text();
  const body = decodeBody(text);
  if (!response.ok) {
    const detail = errorDetail(body, text);
    const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    throw new CliError(
      'API_ERROR',
      `Failed to fetch Orbit ${resource}: ${status}${detail ? `: ${detail}` : ''}`,
      undefined,
      response.status
    );
  }
  return body;
}

export async function fetchOrbitApp(token: string, resourceId: string): Promise<OrbitAppSnapshot> {
  if (!resourceId.trim()) {
    throw new CliError('VALIDATION_MISSING', 'An Orbit app resource ID is required.');
  }

  const region = await resolveOrbitBaseUrl();
  const response = await apiFetch(`${region.baseUrl}/v1.0/apps/${encodeURIComponent(resourceId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    redirect: 'manual',
  });
  const body = await readOrbitBody(response, 'app');
  if (!isAppResponse(body)) {
    throw new CliError('API_ERROR', 'Invalid Orbit app profile JSON response.', undefined, response.status);
  }
  return {
    app: body,
    etag: response.headers.get('ETag') ?? undefined,
    ...(region.usedFallback ? { regionFallback: true } : {}),
    ...(region.warning ? { regionWarning: region.warning } : {}),
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
