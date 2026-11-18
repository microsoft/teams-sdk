import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountInfo, SilentFlowRequest } from '@azure/msal-node';
import { resolveOrbitBaseUrl } from '../src/utils/orbit-region.js';
import type { OrbitRegionConfig } from '../src/utils/config.js';

const mocks = vi.hoisted(() => ({
  getAccount: vi.fn<() => Promise<AccountInfo | null>>(),
  acquireTokenSilent: vi.fn<(request: SilentFlowRequest) => Promise<{ accessToken: string } | null>>(),
  readOrbitRegion: vi.fn<() => Promise<OrbitRegionConfig | undefined>>(),
  writeOrbitRegion: vi.fn<(region: OrbitRegionConfig) => Promise<void>>(),
}));
vi.mock('../src/utils/config.js', () => ({
  readOrbitRegion: mocks.readOrbitRegion,
  writeOrbitRegion: mocks.writeOrbitRegion,
}));
vi.mock('../src/auth/client.js', () => ({
  getAccount: mocks.getAccount,
  getMsalClient: async () => ({ acquireTokenSilent: mocks.acquireTokenSilent }),
}));

const account: AccountInfo = {
  homeAccountId: 'home-id',
  environment: 'login.microsoftonline.com',
  tenantId: 'tenant-id',
  username: 'test@example.invalid',
  localAccountId: 'local-id',
};

describe('Orbit region discovery', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mocks.getAccount.mockResolvedValue(account);
    mocks.acquireTokenSilent.mockResolvedValue({ accessToken: 'region-token' });
  });

  afterEach(() => vi.unstubAllGlobals());

  function respond(url: string): void {
    fetchMock.mockResolvedValue(Response.json({
      region: 'not-used-to-construct-the-url',
      regionGtms: {
        teamsDeveloperPortal: url,
        teamsDevPortal: 'https://dev.teams.microsoft.com/amer',
      },
    }));
  }

  it('uses the discovered URL verbatim without recognizing or constructing region names', async () => {
    const url = 'https://dev.teams.microsoft.com/synthetic-orbit-route';
    respond(url);
    expect(await resolveOrbitBaseUrl()).toEqual({ baseUrl: url });
    expect(mocks.acquireTokenSilent).toHaveBeenCalledWith({
      account,
      authority: 'https://login.microsoftonline.com/tenant-id',
      scopes: ['https://api.spaces.skype.com/Region.ReadWrite'],
    });
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toBe('https://teams.microsoft.com/api/authsvc/v1.0/users/region');
    expect(init?.method).toBe('POST');
    expect(init?.redirect).toBe('manual');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer region-token');
    expect(init?.body).toBeUndefined();
    expect(mocks.writeOrbitRegion).toHaveBeenCalledWith({
      homeAccountId: account.homeAccountId,
      tenantId: account.tenantId,
      environment: account.environment,
      baseUrl: url,
    });
  });

  it('accepts a discovered MSIT URL without inventing a tenant override', async () => {
    respond('https://dev.teams.microsoft.com/cosmicmsitamer/');
    expect(await resolveOrbitBaseUrl()).toEqual({ baseUrl: 'https://dev.teams.microsoft.com/cosmicmsitamer' });
  });

  it('requires a signed-in account in production', async () => {
    mocks.getAccount.mockResolvedValue(null);
    await expect(resolveOrbitBaseUrl()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports an Americas fallback on silent authentication failure without persisting it', async () => {
    mocks.acquireTokenSilent.mockRejectedValue(new Error('Consent is required'));
    await expect(resolveOrbitBaseUrl()).resolves.toMatchObject({
      baseUrl: 'https://dev.teams.microsoft.com/cosmicprodamer',
      usedFallback: true,
      warning: expect.stringContaining('Consent is required'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.writeOrbitRegion).not.toHaveBeenCalled();
  });

  it('reports an Americas fallback for a missing region token', async () => {
    mocks.acquireTokenSilent.mockResolvedValue(null);
    await expect(resolveOrbitBaseUrl()).resolves.toMatchObject({ usedFallback: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403, 429, 500, 302])('reports discovery HTTP %i with an Americas fallback', async status => {
    fetchMock.mockResolvedValue(new Response('Discovery failed', { status }));
    await expect(resolveOrbitBaseUrl()).resolves.toMatchObject({
      baseUrl: 'https://dev.teams.microsoft.com/cosmicprodamer',
      usedFallback: true,
      warning: expect.stringContaining(`${status} Discovery failed`),
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.writeOrbitRegion).not.toHaveBeenCalled();
  });

  it.each([
    null, {}, { regionGtms: null }, { regionGtms: { teamsDeveloperPortal: 'NA' } },
    { regionGtms: { teamsDeveloperPortal: 123 } },
    { regionGtms: { teamsDevPortal: 'https://dev.teams.microsoft.com/emea' } },
  ])('reports fallback for missing or invalid discovery data: %j', async body => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(resolveOrbitBaseUrl()).resolves.toMatchObject({ usedFallback: true, warning: expect.any(String) });
    expect(mocks.writeOrbitRegion).not.toHaveBeenCalled();
  });

  it.each([
    'http://dev.teams.microsoft.com/cosmicprodamer',
    'https://attacker.invalid/cosmicprodamer',
    'https://dev.teams.microsoft.com.attacker.invalid/cosmicprodamer',
    'https://user:password@dev.teams.microsoft.com/cosmicprodamer',
    'https://dev.teams.microsoft.com:8443/cosmicprodamer',
    'https://dev.teams.microsoft.com/cosmicprodamer?other=1',
    'https://dev.teams.microsoft.com/cosmicprodamer#fragment',
    'https://dev-int.teams.microsoft.com/cosmictestamer',
  ])('rejects an unsafe or unsupported discovered base: %s', async url => {
    respond(url);
    await expect(resolveOrbitBaseUrl()).resolves.toMatchObject({ usedFallback: true, warning: expect.any(String) });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.writeOrbitRegion).not.toHaveBeenCalled();
  });

  it('reports non-JSON success explicitly', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Unexpected</html>'));
    await expect(resolveOrbitBaseUrl()).resolves.toMatchObject({
      usedFallback: true, warning: expect.stringContaining('JSON'),
    });
  });

  it('does not reuse routing or authentication after account changes', async () => {
    respond('https://dev.teams.microsoft.com/cosmicprodamer');
    expect(await resolveOrbitBaseUrl()).toEqual({ baseUrl: 'https://dev.teams.microsoft.com/cosmicprodamer' });
    const secondAccount: AccountInfo = { ...account, homeAccountId: 'second', tenantId: 'second-tenant' };
    mocks.getAccount.mockResolvedValue(secondAccount);
    respond('https://dev.teams.microsoft.com/another-synthetic-route');
    expect(await resolveOrbitBaseUrl()).toEqual({ baseUrl: 'https://dev.teams.microsoft.com/another-synthetic-route' });
    expect(mocks.acquireTokenSilent.mock.calls[1][0].account).toBe(secondAccount);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  function cachedRegion(): OrbitRegionConfig {
    return {
      homeAccountId: account.homeAccountId,
      tenantId: account.tenantId,
      environment: account.environment,
      baseUrl: 'https://dev.teams.microsoft.com/saved-route',
    };
  }

  it('reuses the persisted route without token acquisition or discovery', async () => {
    mocks.readOrbitRegion.mockResolvedValue(cachedRegion());
    expect(await resolveOrbitBaseUrl()).toEqual({ baseUrl: cachedRegion().baseUrl });
    expect(mocks.acquireTokenSilent).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['homeAccountId', 'tenantId', 'environment'] as const)('does not use a cache for another %s', async field => {
    mocks.readOrbitRegion.mockResolvedValue({ ...cachedRegion(), [field]: 'different' });
    respond('https://dev.teams.microsoft.com/new-route');
    expect(await resolveOrbitBaseUrl()).toEqual({ baseUrl: 'https://dev.teams.microsoft.com/new-route' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('reuses the saved route for the supplied login account without discovery or token acquisition', async () => {
    mocks.readOrbitRegion.mockResolvedValue(cachedRegion());
    expect(await resolveOrbitBaseUrl(account)).toEqual({ baseUrl: cachedRegion().baseUrl });
    expect(mocks.getAccount).not.toHaveBeenCalled();
    expect(mocks.acquireTokenSilent).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.writeOrbitRegion).not.toHaveBeenCalled();
  });

  it('discovers and saves a new route when the supplied login account differs', async () => {
    const newAccount: AccountInfo = { ...account, homeAccountId: 'new-account' };
    mocks.readOrbitRegion.mockResolvedValue(cachedRegion());
    respond('https://dev.teams.microsoft.com/new-account-route');
    expect(await resolveOrbitBaseUrl(newAccount)).toEqual({
      baseUrl: 'https://dev.teams.microsoft.com/new-account-route',
    });
    expect(mocks.getAccount).not.toHaveBeenCalled();
    expect(mocks.acquireTokenSilent).toHaveBeenCalledWith(expect.objectContaining({ account: newAccount }));
    expect(mocks.writeOrbitRegion).toHaveBeenCalledWith({
      ...cachedRegion(), homeAccountId: newAccount.homeAccountId,
      baseUrl: 'https://dev.teams.microsoft.com/new-account-route',
    });
  });

  it('rejects an untrusted saved URL and rediscovers instead', async () => {
    mocks.readOrbitRegion.mockResolvedValue({ ...cachedRegion(), baseUrl: 'https://attacker.invalid' });
    respond('https://dev.teams.microsoft.com/safe-route');
    expect(await resolveOrbitBaseUrl()).toMatchObject({
      baseUrl: 'https://dev.teams.microsoft.com/safe-route',
      warning: expect.any(String),
    });
  });

  it('retries discovery after a fallback instead of persisting the default', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network unavailable'));
    expect(await resolveOrbitBaseUrl()).toMatchObject({ usedFallback: true });
    respond('https://dev.teams.microsoft.com/recovered-route');
    expect(await resolveOrbitBaseUrl()).toEqual({ baseUrl: 'https://dev.teams.microsoft.com/recovered-route' });
    expect(mocks.writeOrbitRegion).toHaveBeenCalledOnce();
  });

  it('surfaces a cache read failure while still using successful discovery', async () => {
    mocks.readOrbitRegion.mockRejectedValue(new Error('Cache unreadable'));
    respond('https://dev.teams.microsoft.com/discovered-route');
    expect(await resolveOrbitBaseUrl()).toMatchObject({
      baseUrl: 'https://dev.teams.microsoft.com/discovered-route',
      warning: expect.stringContaining('Cache unreadable'),
    });
  });

  it('keeps a discovered route and reports failure to persist it', async () => {
    mocks.writeOrbitRegion.mockRejectedValue(new Error('Disk full'));
    respond('https://dev.teams.microsoft.com/discovered-route');
    const result = await resolveOrbitBaseUrl();
    expect(result).toMatchObject({
      baseUrl: 'https://dev.teams.microsoft.com/discovered-route',
      warning: expect.stringContaining('Disk full'),
    });
    expect(result.usedFallback).toBeUndefined();
  });
});
