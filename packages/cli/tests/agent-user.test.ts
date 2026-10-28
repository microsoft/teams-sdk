import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccountInfo } from '@azure/msal-node';
import { CliError } from '../src/utils/errors.js';

const mockCreateAgenticUser = vi.fn();
const mockGetOrganizationInfo = vi.fn();
const mockGetAzAccessToken = vi.fn();
const mockIsInteractive = vi.fn();
const mockIsAutoConfirm = vi.fn();
const mockConfirm = vi.fn();
const mockInput = vi.fn();

vi.mock('../src/apps/graph.js', () => ({
  createAgenticUser: (...args: unknown[]) => mockCreateAgenticUser(...args),
  getOrganizationInfo: (...args: unknown[]) => mockGetOrganizationInfo(...args),
}));

vi.mock('../src/utils/az.js', () => ({
  getAzAccessToken: (...args: unknown[]) => mockGetAzAccessToken(...args),
}));

vi.mock('../src/utils/interactive.js', () => ({
  isInteractive: () => mockIsInteractive(),
  isAutoConfirm: () => mockIsAutoConfirm(),
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
  input: (...args: unknown[]) => mockInput(...args),
}));

// Skip the real spinner entirely -- these tests only care about the
// Graph/az orchestration, not spinner rendering (already covered by
// agent-shared-progress.test.ts).
vi.mock('../src/commands/agent/shared.js', () => ({
  withAgentSpinner: async (_text: unknown, _silent: boolean, fn: (spinner: unknown) => unknown) => fn({}),
}));

import { runCreateAgenticUser, slugifyAgentName } from '../src/commands/agent/user/actions.js';

const account: AccountInfo = {
  homeAccountId: 'home-1',
  environment: 'login.microsoftonline.com',
  tenantId: 'tenant-1',
  username: 'user@contoso.com',
  localAccountId: 'oid-1',
};

describe('slugifyAgentName', () => {
  it('lowercases and hyphenates non-alphanumeric characters', () => {
    expect(slugifyAgentName('My Cool Agent!')).toBe('my-cool-agent');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugifyAgentName('--Agent--')).toBe('agent');
  });

  it('falls back to "agent" when nothing alphanumeric survives', () => {
    expect(slugifyAgentName('!!!')).toBe('agent');
  });
});

describe('runCreateAgenticUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsInteractive.mockReturnValue(true);
    mockIsAutoConfirm.mockReturnValue(true); // skip the confirm prompt by default
  });

  it('builds the UPN from the agent name and tenant default domain, using an az-issued admin token', async () => {
    mockGetAzAccessToken.mockResolvedValue('admin-token');
    mockGetOrganizationInfo.mockResolvedValue({ defaultDomain: 'contoso.onmicrosoft.com', countryLetterCode: 'US' });
    mockCreateAgenticUser.mockResolvedValue({ id: 'user-1' });

    const result = await runCreateAgenticUser('My Agent', 'identity-1', account, false);

    expect(mockGetAzAccessToken).toHaveBeenCalledWith('https://graph.microsoft.com', 'tenant-1');
    expect(mockCreateAgenticUser).toHaveBeenCalledWith('admin-token', {
      displayName: 'My Agent',
      mailNickname: 'my-agent',
      userPrincipalName: 'my-agent@contoso.onmicrosoft.com',
      identityParentId: 'identity-1',
      usageLocation: 'US',
    });
    expect(result).toEqual({
      agenticUserId: 'user-1',
      userPrincipalName: 'my-agent@contoso.onmicrosoft.com',
      // isAutoConfirm() is mocked true by default in beforeEach, so license
      // assignment is skipped non-interactively and surfaced for later.
      needsLicense: true,
    });
  });

  it('throws AGENT_IDENTITY_USER_FAILED when no default domain can be found', async () => {
    mockGetAzAccessToken.mockResolvedValue('admin-token');
    mockGetOrganizationInfo.mockResolvedValue({});

    await expect(runCreateAgenticUser('My Agent', 'identity-1', account, false)).rejects.toMatchObject({
      code: 'AGENT_IDENTITY_USER_FAILED',
    });
    expect(mockCreateAgenticUser).not.toHaveBeenCalled();
  });

  it('prompts for usageLocation when the tenant country code is not discoverable', async () => {
    mockIsAutoConfirm.mockReturnValue(false); // --yes implies no interactive prompts at all, including this one
    mockGetAzAccessToken.mockResolvedValue('admin-token');
    mockGetOrganizationInfo.mockResolvedValue({ defaultDomain: 'contoso.onmicrosoft.com' });
    mockConfirm.mockResolvedValue(true);
    mockInput.mockResolvedValue('gb');
    mockCreateAgenticUser.mockResolvedValue({ id: 'user-1' });

    await runCreateAgenticUser('My Agent', 'identity-1', account, false);

    expect(mockInput).toHaveBeenCalled();
    expect(mockCreateAgenticUser).toHaveBeenCalledWith(
      'admin-token',
      expect.objectContaining({ usageLocation: 'GB' })
    );
  });

  it('throws AGENT_IDENTITY_USER_FAILED instead of prompting when not interactive', async () => {
    mockIsInteractive.mockReturnValue(false);
    mockGetAzAccessToken.mockResolvedValue('admin-token');
    mockGetOrganizationInfo.mockResolvedValue({ defaultDomain: 'contoso.onmicrosoft.com' });

    await expect(runCreateAgenticUser('My Agent', 'identity-1', account, false)).rejects.toMatchObject({
      code: 'AGENT_IDENTITY_USER_FAILED',
    });
    expect(mockInput).not.toHaveBeenCalled();
  });

  it('cancels when the user declines the confirm prompt', async () => {
    mockIsAutoConfirm.mockReturnValue(false);
    mockGetAzAccessToken.mockResolvedValue('admin-token');
    mockGetOrganizationInfo.mockResolvedValue({ defaultDomain: 'contoso.onmicrosoft.com', countryLetterCode: 'US' });
    mockConfirm.mockResolvedValue(false);

    await expect(runCreateAgenticUser('My Agent', 'identity-1', account, false)).rejects.toMatchObject({
      code: 'AGENT_IDENTITY_USER_FAILED',
    });
    expect(mockCreateAgenticUser).not.toHaveBeenCalled();
  });

  it('wraps a Graph/az failure in a CliError with AGENT_IDENTITY_USER_FAILED', async () => {
    mockGetAzAccessToken.mockRejectedValue(new Error('not logged in'));

    await expect(runCreateAgenticUser('My Agent', 'identity-1', account, false)).rejects.toBeInstanceOf(CliError);
    await expect(runCreateAgenticUser('My Agent', 'identity-1', account, false)).rejects.toMatchObject({
      code: 'AGENT_IDENTITY_USER_FAILED',
    });
  });
});
