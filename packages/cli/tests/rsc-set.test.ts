// RED/GREEN: verified 2026-04-13 — broke diffRscPermissions to return empty
// arrays and confirmed diff tests failed. Restored and confirmed they pass.

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import type { RscPermissionEntry, AppDetails } from '../src/apps/types.js';
import { diffRscPermissions } from '../src/commands/app/rsc/actions.js';

// ─── diffRscPermissions unit tests ──────────────────────────────────

describe('diffRscPermissions', () => {
  it('returns all as added when current is empty', () => {
    const desired: RscPermissionEntry[] = [
      { name: 'ChannelMessage.Read.Group', type: 'Application' },
      { name: 'TeamSettings.ReadWrite.Group', type: 'Application' },
    ];

    const result = diffRscPermissions([], desired);

    expect(result.added).toEqual(desired);
    expect(result.removed).toEqual([]);
    expect(result.unchanged).toEqual([]);
    expect(result.final).toEqual(desired);
  });

  it('returns all as removed when desired is empty', () => {
    const current: RscPermissionEntry[] = [
      { name: 'ChannelMessage.Read.Group', type: 'Application' },
    ];

    const result = diffRscPermissions(current, []);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual(current);
    expect(result.unchanged).toEqual([]);
    expect(result.final).toEqual([]);
  });

  it('returns all as unchanged when current equals desired', () => {
    const perms: RscPermissionEntry[] = [
      { name: 'ChannelMessage.Read.Group', type: 'Application' },
      { name: 'TeamSettings.ReadWrite.Group', type: 'Application' },
    ];

    const result = diffRscPermissions(perms, perms);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.unchanged).toEqual(perms);
  });

  it('computes mixed adds, removes, and unchanged', () => {
    const current: RscPermissionEntry[] = [
      { name: 'ChannelMessage.Read.Group', type: 'Application' },
      { name: 'TeamSettings.ReadWrite.Group', type: 'Application' },
    ];
    const desired: RscPermissionEntry[] = [
      { name: 'TeamSettings.ReadWrite.Group', type: 'Application' },
      { name: 'ChatMessage.Read.Chat', type: 'Application' },
    ];

    const result = diffRscPermissions(current, desired);

    expect(result.added).toEqual([{ name: 'ChatMessage.Read.Chat', type: 'Application' }]);
    expect(result.removed).toEqual([{ name: 'ChannelMessage.Read.Group', type: 'Application' }]);
    expect(result.unchanged).toEqual([
      { name: 'TeamSettings.ReadWrite.Group', type: 'Application' },
    ]);
  });

  it('treats same name with different type as distinct', () => {
    const current: RscPermissionEntry[] = [
      { name: 'LiveShareSession.ReadWrite.Group', type: 'Application' },
    ];
    const desired: RscPermissionEntry[] = [
      { name: 'LiveShareSession.ReadWrite.Group', type: 'Delegated' },
    ];

    const result = diffRscPermissions(current, desired);

    expect(result.added).toEqual([{ name: 'LiveShareSession.ReadWrite.Group', type: 'Delegated' }]);
    expect(result.removed).toEqual([
      { name: 'LiveShareSession.ReadWrite.Group', type: 'Application' },
    ]);
    expect(result.unchanged).toEqual([]);
  });

  it('deduplicates desired entries by composite key', () => {
    const desired: RscPermissionEntry[] = [
      { name: 'ChannelMessage.Read.Group', type: 'Application' },
      { name: 'ChannelMessage.Read.Group', type: 'Application' },
      { name: 'TeamSettings.ReadWrite.Group', type: 'Application' },
    ];

    const result = diffRscPermissions([], desired);

    expect(result.added).toHaveLength(2);
    expect(result.final).toHaveLength(2);
    expect(result.final).toEqual([
      { name: 'ChannelMessage.Read.Group', type: 'Application' },
      { name: 'TeamSettings.ReadWrite.Group', type: 'Application' },
    ]);
  });
});

// ─── rscSetCommand integration tests ────────────────────────────────

const mockDetails: AppDetails = {
  teamsAppId: 'test-teams-app-id',
  appId: '00000000-0000-0000-0000-000000000001',
  shortName: 'Test App',
  longName: 'Test App',
  shortDescription: 'desc',
  longDescription: 'desc',
  version: '1.0.0',
  developerName: 'dev',
  websiteUrl: 'https://example.com',
  privacyUrl: 'https://example.com/privacy',
  termsOfUseUrl: 'https://example.com/terms',
  manifestVersion: '1.25',
  webApplicationInfoId: 'existing-aad-app-id',
  mpnId: '',
  accentColor: '#FFFFFF',
  authorization: { permissions: { resourceSpecific: [] } },
};

let capturedUpdate: Partial<AppDetails> | null = null;
let currentPerms: RscPermissionEntry[] = [];

vi.mock('../src/apps/api.js', () => ({
  fetchAppDetailsV2: vi.fn(async () => {
    const clone = structuredClone(mockDetails);
    clone.authorization = { permissions: { resourceSpecific: currentPerms } };
    return clone;
  }),
  updateAppDetails: vi.fn(async (_token: string, _id: string, update: Partial<AppDetails>) => {
    capturedUpdate = update;
    return { ...mockDetails, ...update };
  }),
}));

vi.mock('../src/auth/index.js', () => ({
  getAccount: vi.fn().mockResolvedValue({ tenantId: 'test-tenant' }),
  getTokenSilent: vi.fn().mockResolvedValue('fake-token'),
  teamsDevPortalScopes: ['https://dev.teams.microsoft.com/.default'],
}));

vi.mock('../src/utils/spinner.js', () => ({
  createSilentSpinner: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

let jsonOutput: unknown = null;
vi.mock('../src/utils/json-output.js', () => ({
  outputJson: vi.fn((data: unknown) => {
    jsonOutput = data;
  }),
}));

// Mock process.exit to throw instead of exiting
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

afterAll(() => {
  mockExit.mockRestore();
});

describe('rsc set command', () => {
  beforeEach(() => {
    capturedUpdate = null;
    currentPerms = [];
    jsonOutput = null;
    mockExit.mockClear();
  });

  it('adds missing and removes extras in one operation', async () => {
    currentPerms = [{ name: 'ChannelMessage.Read.Group', type: 'Application' }];

    const { rscCommand } = await import('../src/commands/app/rsc/index.js');

    await rscCommand.parseAsync(
      ['set', 'test-teams-app-id', '--permissions', 'TeamSettings.ReadWrite.Group', '--json'],
      { from: 'user' }
    );

    expect(capturedUpdate).not.toBeNull();
    const rsc = capturedUpdate!.authorization?.permissions?.resourceSpecific;
    expect(rsc).toEqual([{ name: 'TeamSettings.ReadWrite.Group', type: 'Application' }]);

    expect(jsonOutput).toEqual({
      added: [{ name: 'TeamSettings.ReadWrite.Group', type: 'Application' }],
      removed: [{ name: 'ChannelMessage.Read.Group', type: 'Application' }],
      unchanged: [],
    });
  });

  it('reports no changes when already in desired state', async () => {
    currentPerms = [{ name: 'TeamSettings.ReadWrite.Group', type: 'Application' }];

    const { rscCommand } = await import('../src/commands/app/rsc/index.js');

    await rscCommand.parseAsync(
      ['set', 'test-teams-app-id', '--permissions', 'TeamSettings.ReadWrite.Group', '--json'],
      { from: 'user' }
    );

    // Should not call updateAppDetails
    expect(capturedUpdate).toBeNull();

    expect(jsonOutput).toEqual({
      added: [],
      removed: [],
      unchanged: [{ name: 'TeamSettings.ReadWrite.Group', type: 'Application' }],
    });
  });

  it('outputs JSON error for unrecognized permission names', async () => {
    const { rscCommand } = await import('../src/commands/app/rsc/index.js');

    await expect(
      rscCommand.parseAsync(
        ['set', 'test-teams-app-id', '--permissions', 'Fake.Permission.Group', '--json'],
        { from: 'user' }
      )
    ).rejects.toThrow('process.exit(1)');

    // wrapAction catches the CliError and outputs JSON error
    expect(jsonOutput).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_FORMAT',
        message: 'Unrecognized permission(s): Fake.Permission.Group',
        suggestion: 'Use `teams app rsc add` for permissions not in the catalog.',
      },
    });

    expect(capturedUpdate).toBeNull();
  });

  it('errors when non-catalog permissions would be dropped', async () => {
    currentPerms = [
      { name: 'Custom.Permission.Group', type: 'Application' },
      { name: 'TeamSettings.ReadWrite.Group', type: 'Application' },
    ];

    const { rscCommand } = await import('../src/commands/app/rsc/index.js');

    await expect(
      rscCommand.parseAsync(
        ['set', 'test-teams-app-id', '--permissions', 'TeamSettings.ReadWrite.Group', '--json'],
        { from: 'user' }
      )
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_CONFLICT',
        message:
          'This app has non-catalog permissions that would be removed: Custom.Permission.Group',
        suggestion:
          'Remove them first with `teams app rsc remove`, then re-run this command. Use `add`/`remove` instead of `set` if you need to keep custom permissions.',
      },
    });

    expect(capturedUpdate).toBeNull();
  });

  it('clears all permissions when --permissions is empty string', async () => {
    currentPerms = [{ name: 'TeamSettings.ReadWrite.Group', type: 'Application' }];

    const { rscCommand } = await import('../src/commands/app/rsc/index.js');

    await rscCommand.parseAsync(['set', 'test-teams-app-id', '--permissions', '', '--json'], {
      from: 'user',
    });

    expect(capturedUpdate).not.toBeNull();
    const rsc = capturedUpdate!.authorization?.permissions?.resourceSpecific;
    expect(rsc).toEqual([]);

    expect(jsonOutput).toEqual({
      added: [],
      removed: [{ name: 'TeamSettings.ReadWrite.Group', type: 'Application' }],
      unchanged: [],
    });
  });
});
