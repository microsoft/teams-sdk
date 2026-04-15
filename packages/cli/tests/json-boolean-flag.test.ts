// RED/GREEN: verified 2026-04-10
// RED: reverted --json to `--json <fields>` in list.ts — test failed because
//      `runAppList({ json: true })` passed a boolean where a string was expected,
//      causing parseJsonFields to throw on `.split()`.
// GREEN: restored boolean `--json` — test passes.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const FAKE_APPS = [
  {
    appId: 'app-1',
    appName: 'Test App',
    teamsAppId: 'teams-1',
    version: '1.0.0',
    updatedAt: '2026-01-01',
  },
  {
    appId: 'app-2',
    appName: 'Another App',
    teamsAppId: 'teams-2',
    version: '2.0.0',
    updatedAt: '2026-02-01',
  },
];

function setupMocks(): void {
  vi.mock('../src/auth/index.js', () => ({
    getAccount: vi.fn().mockResolvedValue({ tenantId: 'fake-tenant' }),
    getTokenSilent: vi.fn().mockResolvedValue('fake-token'),
    teamsDevPortalScopes: ['https://dev.teams.microsoft.com/.default'],
  }));

  vi.mock('../src/apps/index.js', () => ({
    fetchApps: vi.fn().mockResolvedValue(FAKE_APPS),
    fetchApp: vi.fn(),
    fetchAppDetailsV2: vi.fn(),
    showAppDetail: vi.fn(),
  }));

  vi.mock('../src/utils/spinner.js', () => ({
    createSilentSpinner: () => ({
      start: vi.fn().mockReturnThis(),
      stop: vi.fn(),
      error: vi.fn(),
    }),
  }));

  vi.mock('../src/utils/interactive.js', () => ({
    isInteractive: () => false,
    isAutoConfirm: () => false,
    setAutoConfirm: vi.fn(),
  }));

  vi.mock('../src/utils/logger.js', () => ({
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  }));
}

describe('app list --json as boolean flag', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupMocks();
  });

  it('outputs all apps with all fields when --json is true', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { runAppList } = await import('../src/commands/app/list.js');
    await runAppList({ json: true });

    const output = logSpy.mock.calls.map((c) => c[0]).join('\n');
    const parsed = JSON.parse(output);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    // All fields present — not filtered
    expect(parsed[0]).toHaveProperty('appId', 'app-1');
    expect(parsed[0]).toHaveProperty('appName', 'Test App');
    expect(parsed[0]).toHaveProperty('teamsAppId', 'teams-1');
    expect(parsed[0]).toHaveProperty('version', '1.0.0');
    expect(parsed[0]).toHaveProperty('updatedAt', '2026-01-01');
    expect(parsed[1]).toHaveProperty('appId', 'app-2');

    logSpy.mockRestore();
  });

  it('outputs empty array when no apps exist', async () => {
    vi.doMock('../src/apps/index.js', () => ({
      fetchApps: vi.fn().mockResolvedValue([]),
      fetchApp: vi.fn(),
      fetchAppDetailsV2: vi.fn(),
      showAppDetail: vi.fn(),
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { runAppList } = await import('../src/commands/app/list.js');
    await runAppList({ json: true });

    const output = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(JSON.parse(output)).toEqual([]);

    logSpy.mockRestore();
  });
});
