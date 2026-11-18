import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountInfo } from '@azure/msal-node';
import type { OrbitRegionResolution } from '../src/utils/orbit-region.js';

const mocks = vi.hoisted(() => ({
  getAccount: vi.fn<() => Promise<AccountInfo | null>>(),
  login: vi.fn<() => Promise<AccountInfo>>(),
  resolveOrbitBaseUrl: vi.fn<(account: AccountInfo) => Promise<OrbitRegionResolution>>(),
  checkAndDisplayEnvironment: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../src/auth/index.js', () => ({ getAccount: mocks.getAccount, login: mocks.login }));
vi.mock('../src/utils/orbit-region.js', () => ({ resolveOrbitBaseUrl: mocks.resolveOrbitBaseUrl }));
vi.mock('../src/utils/environment.js', () => ({ checkAndDisplayEnvironment: mocks.checkAndDisplayEnvironment }));
vi.mock('../src/utils/logger.js', () => ({
  logger: { info: mocks.info, warn: mocks.warn, error: vi.fn() },
}));
vi.mock('../src/utils/interactive.js', () => ({
  isInteractive: () => false, isLocalSession: () => true,
}));

import { loginCommand } from '../src/commands/auth/login.js';

const account: AccountInfo = {
  homeAccountId: 'home-id', tenantId: 'tenant-id', localAccountId: 'local-id',
  environment: 'login.microsoftonline.com', username: 'test@example.invalid',
};

describe('login region synchronization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAccount.mockResolvedValue(null);
    mocks.login.mockResolvedValue(account);
    mocks.resolveOrbitBaseUrl.mockResolvedValue({ baseUrl: 'https://dev.teams.microsoft.com/synthetic-route' });
  });

  it('synchronizes the newly signed-in account before checking the environment', async () => {
    await loginCommand.parseAsync([], { from: 'user' });
    expect(mocks.resolveOrbitBaseUrl).toHaveBeenCalledWith(account);
    expect(mocks.resolveOrbitBaseUrl.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.checkAndDisplayEnvironment.mock.invocationCallOrder[0]
    );
    expect(mocks.warn).not.toHaveBeenCalled();
  });

  it('uses the same cache-aware resolver when login is rerun without signing in again', async () => {
    mocks.getAccount.mockResolvedValue(account);
    await loginCommand.parseAsync([], { from: 'user' });
    expect(mocks.resolveOrbitBaseUrl).toHaveBeenCalledWith(account);
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.checkAndDisplayEnvironment).not.toHaveBeenCalled();
  });

  it('warns about fallback without failing login or skipping environment checks', async () => {
    mocks.resolveOrbitBaseUrl.mockResolvedValue({
      baseUrl: 'https://dev.teams.microsoft.com/cosmicprodamer',
      usedFallback: true,
      warning: 'Region discovery unavailable; using Americas.',
    });
    await loginCommand.parseAsync([], { from: 'user' });
    expect(mocks.warn).toHaveBeenCalledWith(expect.stringContaining('using Americas'));
    expect(mocks.checkAndDisplayEnvironment).toHaveBeenCalledWith(account);
  });
});
