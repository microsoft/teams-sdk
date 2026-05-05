import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

vi.mock('../src/apps/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/apps/index.js')>();
  return {
    ...actual,
    fetchApp: vi.fn(),
    fetchBot: vi.fn(),
    updateBot: vi.fn(),
    updateAppDetails: vi.fn(),
    fetchAppDetailsV2: vi.fn(),
    showBasicInfoEditor: vi.fn(),
    getBotLocation: vi.fn(),
    createTdpBotHandler: vi.fn().mockReturnValue({
      createBot: vi.fn().mockResolvedValue(undefined),
    }),
    createAzureBotHandler: vi.fn().mockReturnValue({
      createBot: vi.fn().mockResolvedValue(undefined),
    }),
    discoverAzureBot: vi.fn(),
    uploadIcon: vi.fn(),
    createAadAppViaTdp: vi.fn().mockResolvedValue({
      id: 'aad-object-id',
      appId: 'fake-client-id',
      displayName: 'TestAadApp',
    }),
    createClientSecret: vi.fn().mockResolvedValue({ secretText: 'fake-secret-text' }),
    getAadAppByClientId: vi.fn().mockResolvedValue({ id: 'aad-object-id' }),
    createManifestZip: vi.fn().mockReturnValue(Buffer.from('fake-zip')),
    importAppPackage: vi.fn().mockResolvedValue({ teamsAppId: 'fake-teams-app-id' }),
    installLink: vi.fn((id: string, tenantId: string) =>
      `https://teams.microsoft.com/l/app/${id}?installAppPackage=true&appTenantId=${tenantId}`
    ),
    portalLink: vi.fn((id: string) => `https://dev.teams.microsoft.com/apps/${id}`),
  };
});

const mockGetAccount = vi.fn().mockResolvedValue({ tenantId: 'fake-tenant-id' });
vi.mock('../src/auth/index.js', () => ({
  getAccount: mockGetAccount,
  getTokenSilent: vi.fn().mockResolvedValue('fake-token'),
  graphScopes: ['https://graph.microsoft.com/.default'],
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

vi.mock('../src/utils/interactive.js', () => ({
  confirmAction: vi.fn().mockResolvedValue(true),
  isInteractive: vi.fn().mockReturnValue(false),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../src/utils/config.js', () => ({
  getConfig: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/utils/browser.js', () => ({
  printLinkBanner: vi.fn(),
  openInBrowser: vi.fn(),
}));

vi.mock('../src/utils/az.js', () => ({
  ensureAz: vi.fn(),
  runAz: vi.fn(),
}));

vi.mock('../src/utils/az-prompts.js', () => ({
  resolveSubscription: vi.fn(),
  resolveResourceGroup: vi.fn(),
  ensureTenantMatch: vi.fn(),
}));

let jsonOutput: unknown = null;
vi.mock('../src/utils/json-output.js', () => ({
  outputJson: vi.fn((data: unknown) => {
    jsonOutput = data;
  }),
}));

const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

afterAll(() => {
  mockExit.mockRestore();
});

describe('shared command validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jsonOutput = null;
    mockGetAccount.mockResolvedValue({ tenantId: 'fake-tenant-id' });
  });

  it('rejects app create names that exceed the short-name limit before auth', async () => {
    const { appCreateCommand } = await import('../src/commands/app/create.js');

    await expect(
      appCreateCommand.parseAsync(['--name', 'x'.repeat(31), '--json'], { from: 'user' })
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_FORMAT',
        message: 'Short name must be 30 characters or less.',
      },
    });
    expect(mockGetAccount).not.toHaveBeenCalled();
  });

  it('rejects app update names that exceed the short-name limit before auth', async () => {
    const { appUpdateCommand } = await import('../src/commands/app/update.js');

    await expect(
      appUpdateCommand.parseAsync(['some-app-id', '--name', 'x'.repeat(31), '--json'], {
        from: 'user',
      })
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_FORMAT',
        message: 'Short name must be 30 characters or less.',
      },
    });
    expect(mockGetAccount).not.toHaveBeenCalled();
  });
});
