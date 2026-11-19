import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountInfo } from '@azure/msal-node';
import { checkAndDisplayEnvironment } from '../src/utils/environment.js';

const mocks = vi.hoisted(() => ({
  getTokenSilent: vi.fn<() => Promise<string | null>>(),
  resolveOrbitBaseUrl: vi.fn<() => Promise<{ baseUrl: string; warning?: string }>>(),
  info: vi.fn(),
  debug: vi.fn(),
  isAzInstalled: vi.fn<() => Promise<boolean>>(),
}));
vi.mock('../src/auth/index.js', () => ({
  getTokenSilent: mocks.getTokenSilent,
  teamsDevPortalScopes: ['https://dev.teams.microsoft.com/AppDefinitions.ReadWrite'],
}));
vi.mock('../src/utils/orbit-region.js', () => ({
  resolveOrbitBaseUrl: mocks.resolveOrbitBaseUrl,
}));
vi.mock('../src/utils/az.js', () => ({
  isAzInstalled: mocks.isAzInstalled,
  isAzLoggedIn: vi.fn(),
  runAz: vi.fn(),
}));
vi.mock('../src/utils/interactive.js', () => ({ isInteractive: () => false }));
vi.mock('../src/utils/logger.js', () => ({ logger: { info: mocks.info, debug: mocks.debug } }));
vi.mock('../src/utils/spinner.js', () => ({
  createSilentSpinner: () => ({
    start: () => ({ success: vi.fn(), warn: vi.fn() }),
  }),
}));

const account: AccountInfo = {
  homeAccountId: 'home-id', localAccountId: 'local-id', tenantId: 'tenant-id',
  environment: 'login.microsoftonline.com', username: 'test@example.invalid',
};

describe('environment sideloading checks', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const baseUrl = 'https://dev.teams.microsoft.com/synthetic-orbit-route';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mocks.getTokenSilent.mockResolvedValue('test-token');
    mocks.resolveOrbitBaseUrl.mockResolvedValue({ baseUrl });
    mocks.isAzInstalled.mockResolvedValue(false);
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    { tenant: true, user: true, text: 'enabled' },
    { tenant: false, user: true, text: 'disabled at tenant level' },
    { tenant: true, user: false, text: 'not allowed for your account' },
    { tenant: false, user: false, text: 'disabled' },
  ])('reads tenant=$tenant and user=$user in one request', async ({ tenant, user, text }) => {
    mocks.resolveOrbitBaseUrl.mockResolvedValue({ baseUrl, warning: 'Using Americas.' });
    fetchMock.mockResolvedValueOnce(Response.json({
      tenantSettings: { isSideLoadingInteractionEnabled: tenant },
      appPolicyForUser: { value: { isSideloadingAllowed: user, isUserPinningAllowed: false } },
    }));

    const result = await checkAndDisplayEnvironment(account);

    expect(result.tdp).toEqual({ connected: true, sideloading: { tenant, user } });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/v1.0/users/me`);
    expect(mocks.info).toHaveBeenCalledWith(expect.stringContaining(`Sideloading: ${text}`));
    expect(mocks.debug).toHaveBeenCalledWith('Using Americas.');
  });

  it('keeps unavailable policy unknown while retaining the tenant result', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({
      tenantSettings: { isSideLoadingInteractionEnabled: true },
      appPolicyForUser: null,
    }));

    const result = await checkAndDisplayEnvironment(account);

    expect(result.tdp).toEqual({ connected: true, sideloading: { tenant: true, user: null } });
    expect(mocks.info).toHaveBeenCalledWith(expect.stringContaining('could not determine'));
    expect(mocks.info).not.toHaveBeenCalledWith(expect.stringContaining('blocks it'));
    expect(mocks.info).not.toHaveBeenCalledWith(expect.stringContaining('Ask your admin'));
  });

  it('does not print output in silent mode, including routing diagnostics', async () => {
    mocks.resolveOrbitBaseUrl.mockResolvedValue({ baseUrl, warning: 'Using Americas.' });
    fetchMock.mockResolvedValueOnce(Response.json({
      tenantSettings: { isSideLoadingInteractionEnabled: true }, appPolicyForUser: null,
    }));
    const result = await checkAndDisplayEnvironment(account, true);
    expect(result.tdp?.sideloading.user).toBeNull();
    expect(mocks.info).not.toHaveBeenCalled();
    expect(mocks.debug).not.toHaveBeenCalled();
  });

  it('reports an unavailable aggregate without a second request or a denied policy default', async () => {
    fetchMock.mockImplementation(async () => Response.json({
      errorCode: 'Unavailable', errorMessage: 'Settings unavailable',
    }, { status: 503 }));

    const result = await checkAndDisplayEnvironment(account);

    expect(result.tdp).toEqual({ connected: true, sideloading: { tenant: null, user: null } });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.info).toHaveBeenCalledWith(expect.stringContaining('could not determine'));
    expect(mocks.debug).toHaveBeenCalledWith(expect.stringContaining('Settings unavailable'));
  });

  it('does not fetch settings when no TDP token is available', async () => {
    mocks.getTokenSilent.mockResolvedValue(null);
    const result = await checkAndDisplayEnvironment(account, true);
    expect(result.tdp).toEqual({ connected: false, sideloading: { tenant: null, user: null } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.resolveOrbitBaseUrl).not.toHaveBeenCalled();
  });
});
