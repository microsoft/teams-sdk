import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  acquireTokenInteractive: vi.fn(),
  openInBrowser: vi.fn(),
}));

vi.mock('@azure/msal-node', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@azure/msal-node')>()),
  PublicClientApplication: class {
    acquireTokenInteractive = mocks.acquireTokenInteractive;
  },
}));
vi.mock('../src/auth/cache.js', () => ({ createCachePlugin: async () => undefined }));
vi.mock('../src/utils/interactive.js', () => ({
  isInteractive: () => true,
  isLocalSession: () => true,
}));
vi.mock('../src/utils/browser.js', () => ({ openInBrowser: mocks.openInBrowser }));

import { login } from '../src/auth/client.js';

describe('browser login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.acquireTokenInteractive.mockResolvedValue({ account: { username: 'user@example.com' } });
  });

  it('requests a POST callback and returns the signed-in account', async () => {
    await expect(login()).resolves.toMatchObject({ username: 'user@example.com' });
    expect(mocks.acquireTokenInteractive).toHaveBeenCalledWith(
      expect.objectContaining({ responseMode: 'form_post' })
    );
  });
});
