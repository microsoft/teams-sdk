import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliError } from '../src/utils/errors.js';

const mockRunAz = vi.fn();

vi.mock('../src/utils/az.js', () => ({
  runAz: (...args: unknown[]) => mockRunAz(...args),
}));

import { getAzTenantId, ensureTenantMatch } from '../src/utils/az-prompts.js';

describe('getAzTenantId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tenantId from az account show', async () => {
    mockRunAz.mockResolvedValue({ tenantId: 'tenant-abc' });

    const result = await getAzTenantId();

    expect(result).toBe('tenant-abc');
    expect(mockRunAz).toHaveBeenCalledWith(['account', 'show']);
  });

  it('returns null when az CLI call fails', async () => {
    mockRunAz.mockRejectedValue(new Error('not logged in'));

    const result = await getAzTenantId();

    expect(result).toBeNull();
  });
});

describe('ensureTenantMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when tenants match', async () => {
    mockRunAz.mockResolvedValue({ tenantId: 'tenant-abc' });

    await expect(ensureTenantMatch('tenant-abc')).resolves.toBeUndefined();
  });

  it('throws CliError when tenants differ', async () => {
    mockRunAz.mockResolvedValue({ tenantId: 'tenant-xyz' });

    await expect(ensureTenantMatch('tenant-abc')).rejects.toThrow(CliError);
    await expect(ensureTenantMatch('tenant-abc')).rejects.toThrow(/Tenant mismatch/);
  });

  it('includes both tenant IDs in error message', async () => {
    mockRunAz.mockResolvedValue({ tenantId: 'tenant-xyz' });

    try {
      await ensureTenantMatch('tenant-abc');
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      const cliError = error as CliError;
      expect(cliError.code).toBe('TENANT_MISMATCH');
      expect(cliError.message).toContain('tenant-abc');
      expect(cliError.message).toContain('tenant-xyz');
      expect(cliError.suggestion).toContain('az login --tenant tenant-abc');
    }
  });

  it('does nothing when az CLI fails (indeterminate)', async () => {
    mockRunAz.mockRejectedValue(new Error('not logged in'));

    await expect(ensureTenantMatch('tenant-abc')).resolves.toBeUndefined();
  });
});
