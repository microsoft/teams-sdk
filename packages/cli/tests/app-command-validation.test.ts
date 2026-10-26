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
const mockIsBotCommunicationApiAvailable = vi.fn().mockReturnValue(false);
const mockSetSocketMode = vi.fn();
const mockGetBotLocation = vi.fn().mockResolvedValue('tm');

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
    getBotLocation: mockGetBotLocation,
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
    isBotCommunicationApiAvailable: mockIsBotCommunicationApiAvailable,
    setSocketMode: mockSetSocketMode,
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

  it('creates an app with service management reference and myOrg audience', async () => {
    const { appCreateCommand } = await import('../src/commands/app/create.js');

    await appCreateCommand.parseAsync(
      [
        '--name',
        'Service Tree Bot',
        '--endpoint',
        'https://example.com/api/messages',
        '--service-management-reference',
        'service-tree-id',
        '--sign-in-audience',
        'myOrg',
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

  it('rejects invalid sign-in audience values before auth', async () => {
    const { appCreateCommand } = await import('../src/commands/app/create.js');

    await expect(
      appCreateCommand.parseAsync(
        ['--name', 'Test App', '--sign-in-audience', 'personal', '--json'],
        { from: 'user' }
      )
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_FORMAT',
        message: '--sign-in-audience must be myOrg or multipleOrgs.',
      },
    });
    expect(mockGetAccount).not.toHaveBeenCalled();
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

describe('app create --messaging-mode', () => {
  // Commander keeps parsed option values on the command instance, so load a
  // fresh command per test to keep --messaging-mode from leaking between parses.
  async function freshCreateCommand() {
    vi.resetModules();
    const { appCreateCommand } = await import('../src/commands/app/create.js');
    return appCreateCommand;
  }

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
    mockIsBotCommunicationApiAvailable.mockReturnValue(true);
    mockSetSocketMode.mockResolvedValue({ configuration: {}, changed: true });
  });

  afterAll(() => {
    mockIsBotCommunicationApiAvailable.mockReturnValue(false);
  });

  it('creates a Teams-managed bot without an endpoint and enables socket mode', async () => {
    const command = await freshCreateCommand();

    await command.parseAsync(['--name', 'Socket Bot', '--messaging-mode', 'socket', '--json'], { from: 'user' });

    expect(mockCreateBot).toHaveBeenCalledWith({
      botId: 'fake-client-id',
      name: 'Socket Bot',
      endpoint: undefined,
    });
    expect(mockSetSocketMode).toHaveBeenCalledWith('fake-token', 'fake-client-id', true);
    expect(jsonOutput).toEqual(
      expect.objectContaining({ endpoint: null, socketMode: true })
    );
  });

  it('reports socketModeError in JSON when enabling fails', async () => {
    mockSetSocketMode.mockRejectedValue(new Error('Forbidden'));
    const command = await freshCreateCommand();

    await command.parseAsync(['--name', 'Socket Bot', '--messaging-mode', 'socket', '--json'], { from: 'user' });

    expect(jsonOutput).toEqual(
      expect.objectContaining({
        teamsAppId: 'fake-teams-app-id',
        socketMode: false,
        socketModeError: 'Forbidden',
      })
    );
  });

  it('rejects --messaging-mode socket with --endpoint before auth', async () => {
    const command = await freshCreateCommand();

    await expect(
      command.parseAsync(
        ['--name', 'Bot', '--messaging-mode', 'socket', '--endpoint', 'https://example.com/api/messages', '--json'],
        { from: 'user' }
      )
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toMatchObject({ ok: false, error: { code: 'VALIDATION_CONFLICT' } });
    expect(mockGetAccount).not.toHaveBeenCalled();
  });

  it('rejects --messaging-mode socket with --azure before auth', async () => {
    const command = await freshCreateCommand();

    await expect(
      command.parseAsync(['--name', 'Bot', '--messaging-mode', 'socket', '--azure', '--json'], { from: 'user' })
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toMatchObject({ ok: false, error: { code: 'VALIDATION_CONFLICT' } });
    expect(mockGetAccount).not.toHaveBeenCalled();
  });

  it('rejects --messaging-mode socket when the API is unavailable (TEAMS_DEV_API unset)', async () => {
    mockIsBotCommunicationApiAvailable.mockReturnValue(false);
    const command = await freshCreateCommand();

    await expect(
      command.parseAsync(['--name', 'Bot', '--messaging-mode', 'socket', '--json'], { from: 'user' })
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toMatchObject({ ok: false, error: { code: 'VALIDATION_MISSING' } });
    expect(mockGetAccount).not.toHaveBeenCalled();
    expect(mockSetSocketMode).not.toHaveBeenCalled();
  });
});

describe('app update --messaging-mode', () => {
  async function freshUpdateCommand() {
    vi.resetModules();
    const { appUpdateCommand } = await import('../src/commands/app/update.js');
    return appUpdateCommand;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    jsonOutput = null;
    mockGetAccount.mockResolvedValue({ tenantId: 'fake-tenant-id' });
    mockGetBotLocation.mockResolvedValue('tm');
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
      messagingEndpoint: 'https://old.example.com/api/messages',
      callingEndpoint: null,
      description: '',
      configuredChannels: ['msteams'],
      isSingleTenant: true,
    });
    mockFetchAppDetailsV2.mockResolvedValue({
      teamsAppId: 'some-app-id',
      version: '1.0.0',
      validDomains: [],
      bots: [{ botId: 'bot-id', scopes: ['personal'] }],
    });
    mockIsBotCommunicationApiAvailable.mockReturnValue(true);
    mockSetSocketMode.mockResolvedValue({ configuration: {}, changed: true });
  });

  afterAll(() => {
    mockIsBotCommunicationApiAvailable.mockReturnValue(false);
  });

  it('enables socket mode with --messaging-mode socket', async () => {
    const command = await freshUpdateCommand();

    await command.parseAsync(['some-app-id', '--messaging-mode', 'socket', '--json'], { from: 'user' });

    expect(mockSetSocketMode).toHaveBeenCalledWith('fake-token', 'bot-id', true);
    expect(mockUpdateBot).not.toHaveBeenCalled();
    expect(jsonOutput).toMatchObject({
      teamsAppId: 'some-app-id',
      botId: 'bot-id',
      updated: { socketMode: true },
    });
  });

  it('disables socket mode with --messaging-mode http', async () => {
    const command = await freshUpdateCommand();

    await command.parseAsync(['some-app-id', '--messaging-mode', 'http', '--json'], { from: 'user' });

    expect(mockSetSocketMode).toHaveBeenCalledWith('fake-token', 'bot-id', false);
    expect(jsonOutput).toMatchObject({ updated: { socketMode: false } });
    expect(jsonOutput).not.toHaveProperty('needsEndpoint');
  });

  it('reports needsEndpoint in JSON when switching to HTTP without an endpoint', async () => {
    mockFetchBot.mockResolvedValue({
      botId: 'bot-id',
      name: 'Test Bot',
      messagingEndpoint: '',
      callingEndpoint: null,
      description: '',
      configuredChannels: ['msteams'],
      isSingleTenant: true,
    });
    const command = await freshUpdateCommand();

    await command.parseAsync(['some-app-id', '--messaging-mode', 'http', '--json'], { from: 'user' });

    expect(mockSetSocketMode).toHaveBeenCalledWith('fake-token', 'bot-id', false);
    expect(jsonOutput).toMatchObject({ updated: { socketMode: false }, needsEndpoint: true });
  });

  it('sets the endpoint before switching to HTTP with --messaging-mode http --endpoint', async () => {
    const command = await freshUpdateCommand();

    await command.parseAsync(
      ['some-app-id', '--messaging-mode', 'http', '--endpoint', 'https://new.example.com/api/messages', '--json'],
      { from: 'user' }
    );

    expect(mockUpdateBot).toHaveBeenCalledWith(
      'fake-token',
      expect.objectContaining({ messagingEndpoint: 'https://new.example.com/api/messages' })
    );
    expect(mockSetSocketMode).toHaveBeenCalledWith('fake-token', 'bot-id', false);
    expect(mockUpdateBot.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetSocketMode.mock.invocationCallOrder[0]
    );
    expect(jsonOutput).toMatchObject({
      updated: { endpoint: 'https://new.example.com/api/messages', socketMode: false },
    });
  });

  it('does not change messaging mode for --endpoint alone', async () => {
    const command = await freshUpdateCommand();

    await command.parseAsync(
      ['some-app-id', '--endpoint', 'https://new.example.com/api/messages', '--json'],
      { from: 'user' }
    );

    expect(mockSetSocketMode).not.toHaveBeenCalled();
  });

  it('rejects an invalid --messaging-mode value before auth', async () => {
    const command = await freshUpdateCommand();

    await expect(
      command.parseAsync(['some-app-id', '--messaging-mode', 'websocket', '--json'], { from: 'user' })
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toMatchObject({ ok: false, error: { code: 'VALIDATION_FORMAT' } });
    expect(mockGetAccount).not.toHaveBeenCalled();
  });

  it('rejects --messaging-mode socket with --endpoint before auth', async () => {
    const command = await freshUpdateCommand();

    await expect(
      command.parseAsync(
        ['some-app-id', '--messaging-mode', 'socket', '--endpoint', 'https://new.example.com/api/messages', '--json'],
        { from: 'user' }
      )
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toMatchObject({ ok: false, error: { code: 'VALIDATION_CONFLICT' } });
    expect(mockGetAccount).not.toHaveBeenCalled();
  });

  it('rejects mode flags when the API is unavailable (TEAMS_DEV_API unset)', async () => {
    mockIsBotCommunicationApiAvailable.mockReturnValue(false);
    const command = await freshUpdateCommand();

    await expect(
      command.parseAsync(['some-app-id', '--messaging-mode', 'http', '--json'], { from: 'user' })
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toMatchObject({ ok: false, error: { code: 'VALIDATION_MISSING' } });
    expect(mockGetAccount).not.toHaveBeenCalled();
  });

  it('rejects Azure bots before any mutation', async () => {
    mockGetBotLocation.mockResolvedValue('azure');
    const command = await freshUpdateCommand();

    await expect(
      command.parseAsync(['some-app-id', '--messaging-mode', 'socket', '--name', 'New Name', '--json'], {
        from: 'user',
      })
    ).rejects.toThrow('process.exit(1)');

    expect(jsonOutput).toMatchObject({ ok: false, error: { code: 'VALIDATION_CONFLICT' } });
    expect(mockSetSocketMode).not.toHaveBeenCalled();
    expect(mockUpdateAppDetails).not.toHaveBeenCalled();
  });
});
