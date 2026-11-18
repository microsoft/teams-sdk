import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  acquireTokenInteractive: vi.fn(),
  openInBrowser: vi.fn(),
  getAllAccounts: vi.fn(),
  removeAccount: vi.fn(),
  clearOrbitRegion: vi.fn(),
}));

vi.mock('@azure/msal-node', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@azure/msal-node')>()),
  PublicClientApplication: class {
    acquireTokenInteractive = mocks.acquireTokenInteractive;
    getTokenCache() {
      return { getAllAccounts: mocks.getAllAccounts, removeAccount: mocks.removeAccount };
    }
  },
}));
vi.mock('../src/auth/cache.js', () => ({ createCachePlugin: async () => undefined }));
vi.mock('../src/utils/interactive.js', () => ({
  isInteractive: () => true,
  isLocalSession: () => true,
}));
vi.mock('../src/utils/browser.js', () => ({ openInBrowser: mocks.openInBrowser }));
vi.mock('../src/utils/config.js', () => ({ clearOrbitRegion: mocks.clearOrbitRegion }));

import { login, logout } from '../src/auth/client.js';

describe('browser login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.acquireTokenInteractive.mockResolvedValue({ account: { username: 'user@example.com' } });
    mocks.getAllAccounts.mockResolvedValue([]);
  });

  it('requests a POST callback and returns the signed-in account', async () => {
    await expect(login()).resolves.toMatchObject({ username: 'user@example.com' });
    expect(mocks.acquireTokenInteractive).toHaveBeenCalledWith(
      expect.objectContaining({ responseMode: 'form_post' })
    );
  });

  it('clears persisted routing when signing out', async () => {
    const account = { homeAccountId: 'home-id' };
    mocks.getAllAccounts.mockResolvedValue([account]);
    await logout();
    expect(mocks.removeAccount).toHaveBeenCalledWith(account);
    expect(mocks.clearOrbitRegion).toHaveBeenCalledOnce();
  });

  it('clears orphaned routing even when the auth cache is empty', async () => {
    await logout();
    expect(mocks.clearOrbitRegion).toHaveBeenCalledOnce();
  });
});
