import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateOrbitApp } from '../src/apps/orbit-api.js';
import type { OrbitAppResponse, OrbitManifestUpdates, OrbitPatchOperation } from '../src/apps/orbit-types.js';

const routing = vi.hoisted(() => ({ resolveOrbitBaseUrl: vi.fn() }));
vi.mock('../src/utils/orbit-region.js', () => ({ resolveOrbitBaseUrl: routing.resolveOrbitBaseUrl }));

function app(): OrbitAppResponse {
  return {
    appId: 'resource-id',
    appProfile: {
      appDetails: {
        applicationManifest: {
          id: 'manifest-id',
          version: '1.2.3',
          name: { short: 'Old name', full: 'Full name' },
          description: { short: 'Short description', full: 'Full description', features: null },
          developer: { name: 'Developer', websiteUrl: 'https://example.invalid', futureField: true },
          bots: [{
            botId: 'bot-client-id', scopes: ['personal'], supportsFiles: true,
            commandLists: [{ scopes: ['personal'], commands: [{ title: 'Help', description: 'Help' }] }],
          }],
          authorization: { permissions: { resourceSpecific: [], orgWide: ['keep'] }, futureField: true },
          webApplicationInfo: { id: 'sso-client-id', resource: 'api://existing', futureField: true },
          futureSection: { 'key/with~punctuation': true },
        },
        firstPartySettings: { keywords: ['preserve'] },
      },
      appMetadata: { source: 'preserve' },
    },
  };
}

describe('Orbit app definition updates', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const baseUrl = 'https://dev.teams.microsoft.com/synthetic-route';

  beforeEach(() => {
    fetchMock.mockReset();
    routing.resolveOrbitBaseUrl.mockReset();
    routing.resolveOrbitBaseUrl.mockResolvedValue({ baseUrl });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  function initial(value: OrbitAppResponse = app(), etag: string | undefined = '"read-etag"'): void {
    fetchMock.mockResolvedValueOnce(Response.json(value, { headers: etag ? { ETag: etag } : {} }));
  }

  function updated(): void {
    const saved = app();
    saved.appProfile.appDetails.applicationManifest.name = { short: 'Server name', full: 'Full name' };
    saved.appProfile.appDetails.applicationManifest.version = '1.2.4';
    fetchMock.mockResolvedValueOnce(Response.json(saved, { headers: { ETag: '"saved-etag"' } }));
  }

  function operations(): OrbitPatchOperation[] {
    const body = fetchMock.mock.calls[1]?.[1]?.body;
    expect(typeof body).toBe('string');
    return typeof body === 'string' ? JSON.parse(body) : [];
  }

  it('patches changed fields with the exact read ETag and returns the authoritative profile', async () => {
    initial();
    updated();
    const buildUpdates = vi.fn(() => ({ name: { short: 'New name' } }));
    const result = await updateOrbitApp('app-token', 'resource-id', buildUpdates);

    expect(routing.resolveOrbitBaseUrl).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      [`${baseUrl}/v1.0/apps/resource-id`, 'GET'],
      [`${baseUrl}/v1.0/apps/resource-id`, 'PATCH'],
    ]);
    expect(buildUpdates).toHaveBeenCalledWith(app().appProfile.appDetails.applicationManifest);
    const init = fetchMock.mock.calls[1][1];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer app-token');
    expect(headers.get('If-Match')).toBe('"read-etag"');
    expect(headers.get('Content-Type')).toBe('application/json-patch+json');
    expect(init?.redirect).toBe('manual');
    expect(operations()).toEqual([
      { op: 'replace', path: '/applicationManifest/name/short', value: 'New name' },
      { op: 'replace', path: '/applicationManifest/version', value: '1.2.4' },
    ]);
    expect(result).toMatchObject({
      changed: true, versionBumped: true, previousVersion: '1.2.3', etag: '"saved-etag"',
      app: { appProfile: { appDetails: { applicationManifest: { name: { short: 'Server name' } } } } },
    });
  });

  it.each([{}, { name: { short: 'Old name' } }, { authorization: { permissions: { resourceSpecific: [] } } }])(
    'does not PATCH an unchanged definition: %j', async updates => {
      initial();
      const result = await updateOrbitApp('app-token', 'resource-id', () => updates);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ changed: false, versionBumped: false, etag: '"read-etag"' });
      expect(result).not.toHaveProperty('previousVersion');
    }
  );

  it.each([
    { version: '2.0.0', expected: '2.0.0' },
    { version: '1.2.3', expected: undefined },
  ])('respects an explicitly supplied version $version', async ({ version, expected }) => {
    initial();
    updated();
    const result = await updateOrbitApp('app-token', 'resource-id', () => ({
      name: { short: 'New name' }, version,
    }));
    expect(result.versionBumped).toBe(false);
    const versionChange = operations().find(operation => operation.path === '/applicationManifest/version');
    expect(versionChange).toEqual(expected ? {
      op: 'replace', path: '/applicationManifest/version', value: expected,
    } : undefined);
  });

  it('does not auto-bump when disabled', async () => {
    initial();
    updated();
    const result = await updateOrbitApp('app-token', 'resource-id',
      () => ({ name: { short: 'New name' } }), { autoBumpVersion: false });
    expect(result.versionBumped).toBe(false);
    expect(operations()).toHaveLength(1);
  });

  it.each([
    { version: '1.0', expected: '1.1' },
    { version: 'not-a-version', expected: undefined },
    { version: null, expected: undefined },
  ])('uses the existing bump rules for version $version', async ({ version, expected }) => {
    const source = app();
    source.appProfile.appDetails.applicationManifest.version = version;
    initial(source);
    updated();
    const result = await updateOrbitApp('app-token', 'resource-id', () => ({ name: { short: 'New name' } }));
    expect(result.versionBumped).toBe(expected !== undefined);
    expect(operations().find(operation => operation.path === '/applicationManifest/version')).toEqual(
      expected ? { op: 'replace', path: '/applicationManifest/version', value: expected } : undefined
    );
  });

  it('creates missing or null parents and preserves unrelated fields in existing parents', async () => {
    const source = app();
    source.appProfile.appDetails.applicationManifest.authorization = null;
    delete source.appProfile.appDetails.applicationManifest.webApplicationInfo;
    initial(source);
    updated();
    await updateOrbitApp('app-token', 'resource-id', () => ({
      developer: { websiteUrl: 'https://new.invalid' },
      authorization: { permissions: { resourceSpecific: [{ name: 'Permission', type: 'Application' }] } },
      webApplicationInfo: { id: 'sso-client-id', resource: 'api://new' },
    }), { autoBumpVersion: false });

    expect(operations()).toEqual([
      { op: 'replace', path: '/applicationManifest/developer/websiteUrl', value: 'https://new.invalid' },
      { op: 'replace', path: '/applicationManifest/authorization',
        value: { permissions: { resourceSpecific: [{ name: 'Permission', type: 'Application' }] } } },
      { op: 'add', path: '/applicationManifest/webApplicationInfo',
        value: { id: 'sso-client-id', resource: 'api://new' } },
    ]);
  });

  it('updates scopes from the fresh manifest without discarding other bots or bot properties', async () => {
    const source = app();
    source.appProfile.appDetails.applicationManifest.bots?.push({ botId: 'second-bot', scopes: ['team'] });
    initial(source);
    updated();
    await updateOrbitApp('app-token', 'resource-id', manifest => ({
      bots: manifest.bots?.map((bot, index) => index === 0 ? { ...bot, scopes: ['personal', 'team'] } : bot),
      authorization: { permissions: { resourceSpecific: [{ name: 'Permission', type: 'Delegated' }] } },
      webApplicationInfo: { resource: 'api://new' },
    }), { autoBumpVersion: false });

    const expectedBots = structuredClone(source.appProfile.appDetails.applicationManifest.bots);
    if (expectedBots?.[0]) expectedBots[0].scopes = ['personal', 'team'];
    expect(operations()).toEqual([
      { op: 'replace', path: '/applicationManifest/bots', value: expectedBots },
      { op: 'replace', path: '/applicationManifest/authorization/permissions/resourceSpecific',
        value: [{ name: 'Permission', type: 'Delegated' }] },
      { op: 'replace', path: '/applicationManifest/webApplicationInfo/resource', value: 'api://new' },
    ]);
  });

  it('supports removing optional blocks and explicit empty arrays', async () => {
    initial();
    updated();
    await updateOrbitApp('app-token', 'resource-id', () => ({
      webApplicationInfo: undefined, validDomains: [], bots: [],
    }), { autoBumpVersion: false });
    expect(operations()).toEqual([
      { op: 'remove', path: '/applicationManifest/webApplicationInfo' },
      { op: 'add', path: '/applicationManifest/validDomains', value: [] },
      { op: 'replace', path: '/applicationManifest/bots', value: [] },
    ]);
  });

  it('updates bot scopes, personal tabs, and Copilot metadata in one versioned change', async () => {
    const source = app();
    source.appProfile.appDetails.applicationManifest.staticTabs = [{
      entityId: 'conversations', scopes: ['personal'], futureField: true,
    }];
    source.appProfile.appDetails.applicationManifest.copilotAgents = {
      customEngineAgents: [{ type: 'bot', id: 'bot-client-id' }],
    };
    initial(source);
    updated();
    await updateOrbitApp('app-token', 'resource-id', manifest => ({
      bots: manifest.bots?.map(bot => ({ ...bot, scopes: ['team'] })),
      staticTabs: [],
      copilotAgents: undefined,
    }));
    expect(operations().map(operation => [operation.op, operation.path])).toEqual([
      ['replace', '/applicationManifest/bots'],
      ['replace', '/applicationManifest/staticTabs'],
      ['remove', '/applicationManifest/copilotAgents'],
      ['replace', '/applicationManifest/version'],
    ]);
  });

  it('can return a no-op without an ETag when no write is needed', async () => {
    initial(app(), '');
    const result = await updateOrbitApp('app-token', 'resource-id', () => ({}));
    expect(result).toMatchObject({ changed: false, versionBumped: false });
    expect(result.etag).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each(['', '*', 'W/"weak-etag"'])('refuses writes without an exact usable ETag: %j', async etag => {
    initial(app(), etag);
    await expect(updateOrbitApp('app-token', 'resource-id', () => ({ version: '2.0.0' })))
      .rejects.toMatchObject({ code: 'API_ERROR', message: expect.stringContaining('ETag') });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([400, 403, 412, 429, 500])('surfaces PATCH HTTP %i without retry or legacy fallback', async status => {
    initial();
    fetchMock.mockResolvedValueOnce(Response.json({
      errorCode: status === 412 ? 'PreconditionFailed' : 'ServiceError', errorMessage: 'Update rejected',
    }, { status }));
    await expect(updateOrbitApp('app-token', 'resource-id', () => ({ version: '2.0.0' })))
      .rejects.toMatchObject({
        code: 'API_ERROR', statusCode: status, message: expect.stringContaining('Update rejected'),
        ...(status === 412 ? { suggestion: expect.stringContaining('latest') } : {}),
      });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects identity changes before PATCH', async () => {
    initial();
    const updates = { id: 'different-id', version: '2.0.0' };
    await expect(updateOrbitApp('app-token', 'resource-id', () => updates))
      .rejects.toMatchObject({ code: 'VALIDATION_CONFLICT' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not issue a request for an empty resource ID', async () => {
    await expect(updateOrbitApp('app-token', ' ', () => ({})))
      .rejects.toMatchObject({ code: 'VALIDATION_MISSING' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not build or write updates after a failed profile read', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ errorMessage: 'Read denied' }, { status: 403 }));
    const buildUpdates = vi.fn(() => ({ version: '2.0.0' }));
    await expect(updateOrbitApp('app-token', 'resource-id', buildUpdates))
      .rejects.toMatchObject({ code: 'API_ERROR', statusCode: 403 });
    expect(buildUpdates).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not retry a PATCH after a transport failure with an unknown write outcome', async () => {
    initial();
    const failure = new Error('Connection interrupted');
    fetchMock.mockRejectedValueOnce(failure);
    await expect(updateOrbitApp('app-token', 'resource-id', () => ({ version: '2.0.0' })))
      .rejects.toBe(failure);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a malformed PATCH response without inventing success', async () => {
    initial();
    fetchMock.mockResolvedValueOnce(Response.json({}));
    await expect(updateOrbitApp('app-token', 'resource-id', () => ({ version: '2.0.0' })))
      .rejects.toMatchObject({ code: 'API_ERROR', statusCode: 200 });
  });

  it('keeps missing response ETags explicit and carries routing diagnostics', async () => {
    routing.resolveOrbitBaseUrl.mockResolvedValue({ baseUrl, usedFallback: true, warning: 'Using Americas.' });
    initial();
    fetchMock.mockResolvedValueOnce(Response.json(app()));
    const updates: OrbitManifestUpdates = { version: '2.0.0' };
    const result = await updateOrbitApp('app-token', 'resource-id', () => updates);
    expect(result.etag).toBeUndefined();
    expect(result).toMatchObject({ changed: true, regionFallback: true, regionWarning: 'Using Americas.' });
  });
});
