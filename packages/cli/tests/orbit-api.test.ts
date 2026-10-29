import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOrbitApp, toAppDetails } from '../src/apps/orbit-api.js';
import type { OrbitAppResponse } from '../src/apps/orbit-types.js';
import { CliError } from '../src/utils/errors.js';

vi.mock('../src/utils/tdp-host.js', () => ({
  TDP_V2_BASE_URL: 'https://dev-int.teams.microsoft.com/cosmictestamer',
}));

function makeApp(): OrbitAppResponse {
  return {
    appId: 'resource-id',
    appProfile: {
      appDetails: {
        applicationManifest: {
          id: 'manifest-id',
          manifestVersion: '1.25',
          version: '1.2.3',
          name: { short: 'Example bot', full: 'Example bot application' },
          description: { short: 'Short description', full: 'Full description', features: null },
          developer: {
            name: 'Example developer',
            websiteUrl: 'https://example.invalid',
            privacyUrl: 'https://example.invalid/privacy',
            termsOfUseUrl: 'https://example.invalid/terms',
            mpnId: '12345',
          },
          accentColor: '#123456',
          icons: { color: 'color.png', outline: 'outline.png' },
          webApplicationInfo: {
            id: 'sso-client-id',
            resource: 'api://botid-bot-client-id',
            nestedAppAuthInfo: { apiVersion: '1.0' },
          },
          validDomains: ['example.invalid'],
          bots: [{
            botId: 'bot-client-id',
            scopes: ['personal', 'team'],
            supportsFiles: true,
            commandLists: [{
              scopes: ['personal'],
              commands: [{ title: 'help', description: 'Show help' }],
            }],
          }],
          authorization: {
            permissions: {
              resourceSpecific: [{ name: 'ChannelMessage.Read.Group', type: 'Application' }],
              futurePermissionSettings: { enabled: true },
            },
            futureAuthorizationField: ['preserve'],
          },
          futureManifestSection: { enabled: true, values: [1, null, 'preserve'] },
        },
        firstPartySettings: { keywords: ['preserve'], isPinnable: true },
      },
      appAccessControl: { appUsers: [{ aadId: 'user-id', role: 'Administrator' }] },
      appMetadata: { source: 'DeveloperPortal' },
    },
  };
}

describe('Orbit profile foundation', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respond(body: unknown, status: number = 200, headers?: HeadersInit): void {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status, headers }));
  }

  it('uses the resource ID and existing Orbit base, retaining the complete response and exact header ETag', async () => {
    const app = makeApp();
    app.etag = 'not-the-header-etag';
    respond(app, 200, { ETag: '"opaque-etag"', 'Content-Type': 'application/json' });

    const result = await fetchOrbitApp('test-token', 'resource-id');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://dev-int.teams.microsoft.com/cosmictestamer/v1.0/apps/resource-id');
    expect(init?.method).toBe('GET');
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(headers.get('User-Agent')).toMatch(/^teams-cli\//);
    expect(headers.get('Client-Source')).toBe(headers.get('User-Agent'));
    expect(result).toEqual({ app, etag: '"opaque-etag"' });
  });

  it('encodes the resource ID as one path segment', async () => {
    respond(makeApp());

    await fetchOrbitApp('test-token', 'resource/id?query#fragment');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://dev-int.teams.microsoft.com/cosmictestamer/v1.0/apps/resource%2Fid%3Fquery%23fragment'
    );
  });

  it('keeps a missing ETag explicit rather than using a body field or inventing one', async () => {
    const app = makeApp();
    app.etag = 'body-only-etag';
    respond(app);

    const result = await fetchOrbitApp('test-token', 'resource-id');

    expect(result.etag).toBeUndefined();
    expect(result).toHaveProperty('etag');
  });

  it('does not cache reads or populate the legacy cache', async () => {
    const { getCachedAppDetails, invalidateAppDetails } = await import('../src/apps/app-details-cache.js');
    invalidateAppDetails();
    respond(makeApp(), 200, { ETag: '"first"' });
    const first = await fetchOrbitApp('test-token', 'resource-id');
    respond(makeApp(), 200, { ETag: '"second"' });
    const second = await fetchOrbitApp('test-token', 'resource-id');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.etag).toBe('"first"');
    expect(second.etag).toBe('"second"');
    expect(getCachedAppDetails('resource-id')).toBeUndefined();
  });

  it('projects unequal resource, manifest, and bot IDs without swapping their meanings', async () => {
    respond(makeApp(), 200, { ETag: '"etag"' });
    const snapshot = await fetchOrbitApp('test-token', 'resource-id');

    const details = toAppDetails(snapshot.app);

    expect(details).toEqual({
      teamsAppId: 'resource-id',
      appId: 'manifest-id',
      shortName: 'Example bot',
      longName: 'Example bot application',
      shortDescription: 'Short description',
      longDescription: 'Full description',
      version: '1.2.3',
      manifestVersion: '1.25',
      developerName: 'Example developer',
      websiteUrl: 'https://example.invalid',
      privacyUrl: 'https://example.invalid/privacy',
      termsOfUseUrl: 'https://example.invalid/terms',
      mpnId: '12345',
      accentColor: '#123456',
      colorIcon: 'color.png',
      outlineIcon: 'outline.png',
      webApplicationInfoId: 'sso-client-id',
      webApplicationInfoResource: 'api://botid-bot-client-id',
      validDomains: ['example.invalid'],
      bots: makeApp().appProfile.appDetails.applicationManifest.bots,
      authorization: makeApp().appProfile.appDetails.applicationManifest.authorization,
    });
    expect(details).not.toHaveProperty('etag');
    expect(details).not.toHaveProperty('firstPartySettings');
    expect(details).not.toHaveProperty('appProfile');
    expect(snapshot.app).toEqual(makeApp());
  });

  it('also preserves equal resource, manifest, and bot IDs', () => {
    const app = makeApp();
    app.appId = 'shared-id';
    app.appProfile.appDetails.applicationManifest.id = 'shared-id';
    app.appProfile.appDetails.applicationManifest.bots = [{ botId: 'shared-id', scopes: ['personal'] }];

    const result = toAppDetails(app);

    expect(result.teamsAppId).toBe('shared-id');
    expect(result.appId).toBe('shared-id');
    expect(result.bots?.[0].botId).toBe('shared-id');
  });

  it('keeps nullable wire fields intact while projecting unset legacy text fields as empty strings', async () => {
    const app: OrbitAppResponse = {
      appId: 'resource-id',
      appProfile: {
        appDetails: {
          applicationManifest: {
            id: 'manifest-id',
            name: null,
            description: null,
            developer: null,
            icons: null,
            version: null,
            manifestVersion: null,
            accentColor: null,
            webApplicationInfo: null,
            validDomains: null,
            bots: null,
            authorization: null,
          },
          firstPartySettings: null,
        },
      },
    };
    respond(app);
    const snapshot = await fetchOrbitApp('test-token', 'resource-id');

    expect(toAppDetails(snapshot.app)).toEqual({
      teamsAppId: 'resource-id', appId: 'manifest-id',
      shortName: '', longName: '', shortDescription: '', longDescription: '',
      version: '', manifestVersion: '', developerName: '', websiteUrl: '',
      privacyUrl: '', termsOfUseUrl: '', mpnId: '', accentColor: '', webApplicationInfoId: '',
    });
    expect(snapshot.app).toEqual(app);
  });

  it('does not alias mutable projected arrays or authorization data back into the wire response', () => {
    const app = makeApp();
    const original = structuredClone(app);
    const result = toAppDetails(app);
    result.validDomains?.push('other.invalid');
    result.bots?.[0].scopes?.push('groupChat');
    const permission = result.authorization?.permissions?.resourceSpecific?.[0];
    if (permission) permission.name = 'Changed.Permission';

    expect(app).toEqual(original);
  });

  it('retains explicit empty arrays in the compatibility projection', () => {
    const app = makeApp();
    app.appProfile.appDetails.applicationManifest.validDomains = [];
    app.appProfile.appDetails.applicationManifest.bots = [];
    app.appProfile.appDetails.applicationManifest.authorization = { permissions: { resourceSpecific: [] } };

    expect(toAppDetails(app)).toMatchObject({
      validDomains: [], bots: [], authorization: { permissions: { resourceSpecific: [] } },
    });
  });

  it.each(['', '   '])('rejects an empty resource ID (%j) before sending a request', async (id) => {
    await expect(fetchOrbitApp('test-token', id)).rejects.toMatchObject({
      name: 'CliError', code: 'VALIDATION_MISSING',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 409, 412, 429, 500])('preserves HTTP %i and the Orbit error details', async (status) => {
    respond({ errorCode: 'ServiceError', errorMessage: 'Specific service failure' }, status);

    await expect(fetchOrbitApp('test-token', 'resource-id')).rejects.toMatchObject({
      name: 'CliError', code: 'API_ERROR', statusCode: status,
      message: expect.stringContaining('Specific service failure'),
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    { body: { AppDetails: ['The target path was not found.'] }, text: 'The target path was not found.' },
    { body: { title: 'Bad Request', errors: { name: ['Name is invalid.'] } }, text: 'Name is invalid.' },
    { body: { title: 'Forbidden', detail: 'Access denied.' }, text: 'Access denied.' },
    { body: 'Plain service error', text: 'Plain service error' },
    { body: { code: 16, message: 'Invalid Subscription' }, text: 'Invalid Subscription' },
  ])('reports nonstandard error bodies without fabricating a profile: $text', async ({ body, text }) => {
    respond(body, 400);

    await expect(fetchOrbitApp('test-token', 'resource-id')).rejects.toMatchObject({
      name: 'CliError', statusCode: 400, message: expect.stringContaining(text),
    });
  });

  it('reports a non-JSON gateway error body', async () => {
    fetchMock.mockResolvedValue(new Response('Gateway unavailable', { status: 502 }));

    await expect(fetchOrbitApp('test-token', 'resource-id')).rejects.toMatchObject({
      name: 'CliError', statusCode: 502, message: expect.stringContaining('Gateway unavailable'),
    });
  });

  it('uses the HTTP status when the error body is empty', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503, statusText: 'Service Unavailable' }));

    await expect(fetchOrbitApp('test-token', 'resource-id')).rejects.toMatchObject({
      name: 'CliError', statusCode: 503, message: expect.stringContaining('503 Service Unavailable'),
    });
  });

  it('rejects a successful non-JSON response with a structured CLI error', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Unexpected gateway page</html>', { status: 200 }));

    await expect(fetchOrbitApp('test-token', 'resource-id')).rejects.toMatchObject({
      name: 'CliError', code: 'API_ERROR', statusCode: 200,
      message: expect.stringContaining('JSON'),
    });
  });

  it.each([
    null,
    [],
    {},
    { appId: 'resource-id', appProfile: null },
    { appId: 'resource-id', appProfile: { appDetails: null } },
    { appId: 'resource-id', appProfile: { appDetails: { applicationManifest: null } } },
    { appId: 'resource-id', appProfile: { appDetails: { applicationManifest: { id: 123 } } } },
    { appId: '', appProfile: { appDetails: { applicationManifest: { id: 'manifest-id' } } } },
  ])('rejects an invalid successful response instead of returning empty defaults: %j', async (body) => {
    respond(body);

    await expect(fetchOrbitApp('test-token', 'resource-id')).rejects.toBeInstanceOf(CliError);
  });

  it.each([
    { field: 'name', value: { short: 123 } },
    { field: 'description', value: 'not-an-object' },
    { field: 'developer', value: { websiteUrl: false } },
    { field: 'icons', value: { outline: [] } },
    { field: 'version', value: 123 },
    { field: 'validDomains', value: ['valid.invalid', 123] },
    { field: 'webApplicationInfo', value: { id: 123 } },
    { field: 'bots', value: [{ botId: 'bot-id', scopes: 'personal' }] },
    { field: 'authorization', value: { permissions: { resourceSpecific: [{ name: 'Permission', type: 'Wrong' }] } } },
  ])('rejects invalid types in the projected manifest field $field', async ({ field, value }) => {
    const app = makeApp();
    respond({
      ...app,
      appProfile: {
        ...app.appProfile,
        appDetails: {
          ...app.appProfile.appDetails,
          applicationManifest: { ...app.appProfile.appDetails.applicationManifest, [field]: value },
        },
      },
    });

    await expect(fetchOrbitApp('test-token', 'resource-id')).rejects.toMatchObject({
      name: 'CliError', code: 'API_ERROR', statusCode: 200,
    });
  });

  it('surfaces network failures without retrying or falling back to legacy APIs', async () => {
    const failure = new Error('Network failed');
    fetchMock.mockRejectedValue(failure);

    await expect(fetchOrbitApp('test-token', 'resource-id')).rejects.toBe(failure);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
