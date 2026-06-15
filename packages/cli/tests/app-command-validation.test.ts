import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const mockFetchApp = vi.fn();
const mockFetchBot = vi.fn();
const mockUpdateBot = vi.fn();
const mockUpdateAppDetails = vi.fn();
const mockFetchAppDetailsV2 = vi.fn();
const mockCreateBot = vi.fn();
const mockCreateAadAppViaTdp = vi.fn();
const mockCreateManifestZip = vi.fn();
const mockImportAppPackage = vi.fn();

vi.mock('../src/apps/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/apps/index.js')>();
  return {
    ...actual,
    fetchApp: mockFetchApp,
    fetchBot: mockFetchBot,
    updateBot: mockUpdateBot,
    updateAppDetails: mockUpdateAppDetails,
    fetchAppDetailsV2: mockFetchAppDetailsV2,
    showBasicInfoEditor: vi.fn(),
    getBotLocation: vi.fn().mockResolvedValue('tm'),
    createTdpBotHandler: vi.fn().mockReturnValue({
      createBot: mockCreateBot,
    }),
    createAzureBotHandler: vi.fn().mockReturnValue({
      createBot: vi.fn().mockResolvedValue(undefined),
      updateEndpoint: vi.fn().mockResolvedValue(undefined),
    }),
    discoverAzureBot: vi.fn(),
    uploadIcon: vi.fn(),
    createAadAppViaTdp: mockCreateAadAppViaTdp,
    createClientSecret: vi.fn().mockResolvedValue({ secretText: 'fake-secret-text' }),
    getAadAppByClientId: vi.fn().mockResolvedValue({ id: 'aad-object-id' }),
    createManifestZip: mockCreateManifestZip,
    importAppPackage: mockImportAppPackage,
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
    mockCreateBot.mockResolvedValue(undefined);
    mockCreateAadAppViaTdp.mockResolvedValue({
      id: 'aad-object-id',
      appId: 'fake-client-id',
      displayName: 'TestAadApp',
    });
    mockCreateManifestZip.mockReturnValue(Buffer.from('fake-zip'));
    mockImportAppPackage.mockResolvedValue({ teamsAppId: 'fake-teams-app-id' });
    mockFetchApp.mockResolvedValue({
      appId: 'aad-object-id',
      appName: 'Test App',
      teamsAppId: 'some-app-id',
      version: '1.0.0',
      updatedAt: null,
      bots: [{ botId: 'bot-id' }],
    });
    mockFetchBot.mockResolvedValue({
      botId: 'bot-id',
      name: 'Test Bot',
      messagingEndpoint: '',
      callingEndpoint: null,
      description: '',
      configuredChannels: ['msteams'],
      isSingleTenant: true,
    });
    mockUpdateBot.mockResolvedValue(undefined);
    mockUpdateAppDetails.mockResolvedValue(undefined);
    mockFetchAppDetailsV2.mockResolvedValue({
      teamsAppId: 'some-app-id',
      appId: 'aad-object-id',
      shortName: 'Existing Name',
      longName: '',
      shortDescription: 'Existing short description',
      longDescription: 'Existing long description',
      version: '1.0.0',
      developerName: 'Existing Developer',
      websiteUrl: 'https://existing.example.com',
      privacyUrl: 'https://existing.example.com/privacy',
      termsOfUseUrl: 'https://existing.example.com/terms',
      manifestVersion: '1.25',
      webApplicationInfoId: '',
      mpnId: '',
      accentColor: '#FFFFFF',
      validDomains: ['*.botframework.com'],
      bots: [{ botId: 'bot-id', scopes: ['personal'] }],
    });
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

  it('uses normalized values throughout app create', async () => {
    const { appCreateCommand } = await import('../src/commands/app/create.js');

    await appCreateCommand.parseAsync(
      [
        '--name',
        '  Test App  ',
        '--endpoint',
        '  https://example.com/api/messages  ',
        '--json',
      ],
      { from: 'user' }
    );

    expect(mockCreateAadAppViaTdp).toHaveBeenCalledWith(
      'fake-token',
      'Test App',
      {
        serviceManagementReference: undefined,
        signInAudience: 'AzureADMultipleOrgs',
      }
    );
    expect(mockCreateManifestZip).toHaveBeenCalledWith(
      expect.objectContaining({
        botName: 'Test App',
        endpoint: 'https://example.com/api/messages',
      })
    );
    expect(mockCreateBot).toHaveBeenCalledWith({
      botId: 'fake-client-id',
      name: 'Test App',
      endpoint: 'https://example.com/api/messages',
    });
    expect(jsonOutput).toEqual(
      expect.objectContaining({
        appName: 'Test App',
        endpoint: 'https://example.com/api/messages',
      })
    );
  });

  it('creates an app with service management reference and single tenant audience', async () => {
    const { appCreateCommand } = await import('../src/commands/app/create.js');

    await appCreateCommand.parseAsync(
      [
        '--name',
        'Service Tree Bot',
        '--endpoint',
        'https://example.com/api/messages',
        '--service-management-reference',
        'service-tree-id',
        '--single-tenant',
        '--no-secret',
        '--json',
      ],
      { from: 'user' }
    );

    expect(mockCreateAadAppViaTdp).toHaveBeenCalledWith(
      'fake-token',
      'Service Tree Bot',
      {
        serviceManagementReference: 'service-tree-id',
        signInAudience: 'AzureADMyOrg',
      }
    );
    expect(mockCreateManifestZip).toHaveBeenCalledWith(
      expect.objectContaining({
        botId: 'fake-client-id',
        botName: 'Service Tree Bot',
        endpoint: 'https://example.com/api/messages',
      })
    );
    expect(mockImportAppPackage).toHaveBeenCalledWith('fake-token', Buffer.from('fake-zip'));
    expect(mockCreateBot).toHaveBeenCalledWith({
      botId: 'fake-client-id',
      name: 'Service Tree Bot',
      endpoint: 'https://example.com/api/messages',
    });
    expect(jsonOutput).toEqual(
      expect.objectContaining({
        appName: 'Service Tree Bot',
        teamsAppId: 'fake-teams-app-id',
        botId: 'fake-client-id',
        endpoint: 'https://example.com/api/messages',
        botLocation: 'teams-managed',
        secretSkipped: true,
        credentials: {
          CLIENT_ID: 'fake-client-id',
          TENANT_ID: 'fake-tenant-id',
        },
      })
    );
  });

  it('uses normalized values throughout app update', async () => {
    const { appUpdateCommand } = await import('../src/commands/app/update.js');

    await appUpdateCommand.parseAsync(
      [
        'some-app-id',
        '--name',
        '  Trimmed Name  ',
        '--endpoint',
        '  https://example.com/api/messages  ',
        '--json',
      ],
      { from: 'user' }
    );

    expect(mockUpdateBot).toHaveBeenCalledWith(
      'fake-token',
      expect.objectContaining({
        messagingEndpoint: 'https://example.com/api/messages',
      })
    );
    expect(mockUpdateAppDetails).toHaveBeenCalledWith(
      'fake-token',
      'some-app-id',
      { validDomains: ['*.botframework.com', 'example.com'] },
      { autoBumpVersion: false }
    );
    expect(mockUpdateAppDetails).toHaveBeenCalledWith(
      'fake-token',
      'some-app-id',
      { shortName: 'Trimmed Name' },
      { autoBumpVersion: false }
    );
    expect(jsonOutput).toEqual(
      expect.objectContaining({
        updated: expect.objectContaining({
          endpoint: 'https://example.com/api/messages',
          shortName: 'Trimmed Name',
        }),
      })
    );
  });
});
