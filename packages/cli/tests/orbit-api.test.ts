import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOrbitApp, fetchOrbitApps, toAppDetails, toAppSummary } from '../src/apps/orbit-api.js';
import type { OrbitAppResponse, OrbitAppSummary } from '../src/apps/orbit-types.js';
import { CliError } from '../src/utils/errors.js';
import type { OrbitRegionResolution } from '../src/utils/orbit-region.js';

const routing = vi.hoisted(() => ({ resolveOrbitBaseUrl: vi.fn<() => Promise<OrbitRegionResolution>>() }));
vi.mock('../src/utils/orbit-region.js', () => ({
  resolveOrbitBaseUrl: routing.resolveOrbitBaseUrl,
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

describe('Orbit API foundation', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    routing.resolveOrbitBaseUrl.mockReset();
    routing.resolveOrbitBaseUrl.mockResolvedValue({ baseUrl: 'https://dev.teams.microsoft.com/synthetic-orbit-route' });
    vi.stubGlobal('fetch', fetchMock);
  });

  describe('Orbit app listing', () => {
    const baseUrl = 'https://dev.teams.microsoft.com/synthetic-orbit-route';

    function summary(resourceId: string = 'resource-id', manifestId: string = 'manifest-id'): OrbitAppSummary {
      return {
        appId: resourceId,
        appExternalId: manifestId,
        appName: 'Example bot',
        appVersion: '1.2.3',
        updatedAt: '2026-11-18T12:00:00Z',
      };
    }

    it('lists summaries without profile lookups or invented bot IDs', async () => {
      const item = summary();
      fetchMock.mockResolvedValue(Response.json({ items: [item] }));

      const result = await fetchOrbitApps('app-token');

      expect(result).toEqual({ apps: [item] });
      expect(toAppSummary(result.apps[0])).toEqual({
        teamsAppId: 'resource-id',
        appId: 'manifest-id',
        appName: 'Example bot',
        version: '1.2.3',
        updatedAt: '2026-11-18T12:00:00Z',
      });
      expect(toAppSummary(result.apps[0])).not.toHaveProperty('bots');
      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${baseUrl}/v1.0/apps?pageSize=50`);
      expect(init?.method).toBe('GET');
      expect(init?.redirect).toBe('manual');
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer app-token');
      expect(headers.get('x-ms-continuation')).toBeNull();
      expect(headers.get('Client-Source')).toMatch(/^teams-cli\//);
    });

    it('follows opaque body tokens unchanged through short and empty pages', async () => {
      const first = summary('resource-1', 'manifest-1');
      const last = summary('resource-2', 'manifest-2');
      const token = 'a+/opaque==';
      fetchMock
        .mockResolvedValueOnce(Response.json({ items: [first], continuationToken: token }))
        .mockResolvedValueOnce(Response.json({ items: [], continuationToken: 'next-token' }))
        .mockResolvedValueOnce(Response.json({ items: [last], continuationToken: '' }));

      expect(await fetchOrbitApps('app-token')).toEqual({ apps: [first, last] });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(routing.resolveOrbitBaseUrl).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        `${baseUrl}/v1.0/apps?pageSize=50`,
        `${baseUrl}/v1.0/apps?pageSize=50`,
        `${baseUrl}/v1.0/apps?pageSize=50`,
      ]);
      expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('x-ms-continuation')).toBe(token);
      expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get('x-ms-continuation')).toBe('next-token');
    });

    it.each([undefined, null, ''])('stops only when the continuation token is absent or empty: %j', async token => {
      fetchMock.mockResolvedValue(Response.json({
        items: [], ...(token !== undefined ? { continuationToken: token } : {}),
      }));
      expect(await fetchOrbitApps('app-token')).toEqual({ apps: [] });
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('retains the raw summary while projecting nullable or absent display metadata', async () => {
      const item: OrbitAppSummary = {
        appId: 'resource-id', appExternalId: 'manifest-id', appName: null,
        appVersion: null, futureListField: { preserve: true },
      };
      fetchMock.mockResolvedValue(Response.json({ items: [item] }));
      const result = await fetchOrbitApps('app-token');
      expect(result.apps[0]).toEqual(item);
      expect(toAppSummary(result.apps[0])).toEqual({
        teamsAppId: 'resource-id', appId: 'manifest-id',
        appName: null, version: null, updatedAt: null,
      });
    });

    it('fetches bot IDs only when the caller requests the selected profile', async () => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ items: [summary(), summary('other-resource', 'other-manifest')] }))
        .mockResolvedValueOnce(Response.json(makeApp(), { headers: { ETag: '"profile-etag"' } }));

      const list = await fetchOrbitApps('app-token');
      expect(fetchMock).toHaveBeenCalledOnce();
      const selected = toAppSummary(list.apps[0]);
      const profile = await fetchOrbitApp('app-token', selected.teamsAppId);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toBe(`${baseUrl}/v1.0/apps/resource-id`);
      expect(toAppDetails(profile.app).bots?.[0].botId).toBe('bot-client-id');
    });

    it('rejects repeated continuation tokens instead of returning partial results or looping', async () => {
      fetchMock.mockImplementation(async () => Response.json({ items: [], continuationToken: 'repeated' }));

      await expect(fetchOrbitApps('app-token')).rejects.toMatchObject({
        code: 'API_ERROR', message: expect.stringContaining('continuation'),
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not return a partial list when a later page fails', async () => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ items: [summary()], continuationToken: 'next' }))
        .mockResolvedValueOnce(Response.json({ errorCode: 'Throttled', errorMessage: 'Try later' }, { status: 429 }));

      await expect(fetchOrbitApps('app-token')).rejects.toMatchObject({
        code: 'API_ERROR', statusCode: 429, message: expect.stringContaining('Try later'),
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it.each([
      null,
      [],
      {},
      { items: null },
      { items: [], continuationToken: 123 },
      { items: [{}] },
      { items: [{ appId: 'resource-id' }] },
      { items: [{ appId: '', appExternalId: 'manifest-id' }] },
      { items: [{ appId: 'resource-id', appExternalId: ' ' }] },
      { items: [{ appId: 'resource-id', appExternalId: 'manifest-id', appName: 123 }] },
    ])('rejects malformed list responses rather than skipping entries: %j', async body => {
      fetchMock.mockResolvedValue(Response.json(body));

      await expect(fetchOrbitApps('app-token')).rejects.toMatchObject({
        code: 'API_ERROR', statusCode: 200,
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('reports a non-JSON successful list response', async () => {
      fetchMock.mockResolvedValue(new Response('<html>Unexpected gateway page</html>'));
      await expect(fetchOrbitApps('app-token')).rejects.toMatchObject({
        code: 'API_ERROR', statusCode: 200, message: expect.stringContaining('JSON'),
      });
    });

    it('carries routing fallback metadata without changing the app summaries', async () => {
      routing.resolveOrbitBaseUrl.mockResolvedValue({
        baseUrl, usedFallback: true, warning: 'Using Americas.',
      });
      fetchMock.mockResolvedValue(Response.json({ items: [summary()] }));

      expect(await fetchOrbitApps('app-token')).toEqual({
        apps: [summary()], regionFallback: true, regionWarning: 'Using Americas.',
      });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respond(body: unknown, status: number = 200, headers?: HeadersInit): void {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status, headers }));
  }

  it('sends the app token only to the resolved regional API', async () => {
    routing.resolveOrbitBaseUrl.mockResolvedValue({ baseUrl: 'https://dev.teams.microsoft.com/another-synthetic-route' });
    respond(makeApp());
    await fetchOrbitApp('app-token', 'resource-id');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://dev.teams.microsoft.com/another-synthetic-route/v1.0/apps/resource-id'
    );
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer app-token');
  });

  it('does not fetch an app when account resolution fails', async () => {
    const error = new CliError('AUTH_REQUIRED', 'Not logged in');
    routing.resolveOrbitBaseUrl.mockRejectedValue(error);
    await expect(fetchOrbitApp('test-token', 'resource-id')).rejects.toBe(error);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retains explicit routing fallback metadata without logging from the API helper', async () => {
    routing.resolveOrbitBaseUrl.mockResolvedValue({
      baseUrl: 'https://dev.teams.microsoft.com/cosmicprodamer',
      usedFallback: true,
      warning: 'Discovery unavailable; using Americas.',
    });
    respond(makeApp());
    const result = await fetchOrbitApp('test-token', 'resource-id');
    expect(result).toMatchObject({
      regionFallback: true, regionWarning: 'Discovery unavailable; using Americas.',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://dev.teams.microsoft.com/cosmicprodamer/v1.0/apps/resource-id'
    );
  });

  it('uses the resource ID and existing Orbit base, retaining the complete response and exact header ETag', async () => {
    const app = makeApp();
    app.etag = 'not-the-header-etag';
    respond(app, 200, { ETag: '"opaque-etag"', 'Content-Type': 'application/json' });

    const result = await fetchOrbitApp('test-token', 'resource-id');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://dev.teams.microsoft.com/synthetic-orbit-route/v1.0/apps/resource-id');
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
      'https://dev.teams.microsoft.com/synthetic-orbit-route/v1.0/apps/resource%2Fid%3Fquery%23fragment'
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
