import { CliError } from '../utils/errors.js';
import { apiFetch } from '../utils/http.js';
import { TDP_V2_BASE_URL } from '../utils/tdp-host.js';
import type {
  OrbitAppResponse, OrbitAppSnapshot, OrbitAuthorization, OrbitBot, OrbitJsonObject, OrbitJsonValue,
} from './orbit-types.js';
import type { AppAuthorization, AppBot, AppDetails } from './types.js';

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

export async function fetchOrbitApp(token: string, resourceId: string): Promise<OrbitAppSnapshot> {
  if (!resourceId.trim()) {
    throw new CliError('VALIDATION_MISSING', 'An Orbit app resource ID is required.');
  }

  const response = await apiFetch(`${TDP_V2_BASE_URL}/v1.0/apps/${encodeURIComponent(resourceId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    redirect: 'manual',
  });
  const text = await response.text();
  const body = decodeBody(text);
  if (!response.ok) {
    const detail = errorDetail(body, text);
    const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    throw new CliError(
      'API_ERROR',
      `Failed to fetch Orbit app: ${status}${detail ? `: ${detail}` : ''}`,
      undefined,
      response.status
    );
  }
  if (!isAppResponse(body)) {
    throw new CliError('API_ERROR', 'Invalid Orbit app profile JSON response.', undefined, response.status);
  }
  return { app: body, etag: response.headers.get('ETag') ?? undefined };
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
