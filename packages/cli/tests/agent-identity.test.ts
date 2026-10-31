import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccountInfo } from '@azure/msal-node';
import { CliError } from '../src/utils/errors.js';

const mockGetBlueprintToken = vi.fn();
const mockCreateAgentIdentity = vi.fn();

vi.mock('../src/apps/graph.js', () => ({
  getBlueprintToken: (...args: unknown[]) => mockGetBlueprintToken(...args),
  createAgentIdentity: (...args: unknown[]) => mockCreateAgentIdentity(...args),
}));

// Skip the real spinner entirely -- these tests only care about the
// Graph/az orchestration, not spinner rendering (already covered by
// agent-shared-progress.test.ts).
vi.mock('../src/commands/agent/shared.js', () => ({
  withAgentSpinner: async (_text: unknown, _silent: boolean, fn: (spinner: unknown) => unknown) => fn({}),
}));

import { runCreateAgentIdentity } from '../src/commands/agent/user/actions.js';

const account: AccountInfo = {
  homeAccountId: 'home-1',
  environment: 'login.microsoftonline.com',
  tenantId: 'tenant-1',
  username: 'user@contoso.com',
  localAccountId: 'oid-1',
};

describe('runCreateAgentIdentity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gets a blueprint token, then creates the identity sponsored by the signed-in account', async () => {
    mockGetBlueprintToken.mockResolvedValue('blueprint-token');
    mockCreateAgentIdentity.mockResolvedValue({ id: 'identity-1' });

    const result = await runCreateAgentIdentity('My Agent', 'bp-1', 'secret', account, false);

    expect(mockGetBlueprintToken).toHaveBeenCalledWith('tenant-1', 'bp-1', 'secret');
    expect(mockCreateAgentIdentity).toHaveBeenCalledWith('blueprint-token', {
      displayName: 'My Agent',
      agentIdentityBlueprintId: 'bp-1',
      sponsorObjectId: 'oid-1',
    });
    // No separate admin-token/Graph permission grant: the blueprint's
    // inheritable-permissions config (set during `agent blueprint create`)
    // already covers this identity's service principal.
    expect(result).toEqual({ agentIdentityId: 'identity-1' });
  });

  it('wraps a Graph failure in a CliError with AGENT_IDENTITY_FAILED', async () => {
    mockGetBlueprintToken.mockResolvedValue('blueprint-token');
    mockCreateAgentIdentity.mockRejectedValue(new Error('403 Forbidden'));

    await expect(runCreateAgentIdentity('My Agent', 'bp-1', 'secret', account, false)).rejects.toMatchObject({
      code: 'AGENT_IDENTITY_FAILED',
      message: expect.stringContaining('403'),
    });
  });
});
