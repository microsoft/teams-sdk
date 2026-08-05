import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppCreateInput } from '../src/commands/app/create-action.js';

const mockCreateAadAppViaTdp = vi.fn();
const mockCreateClientSecret = vi.fn();
const mockCreateManifestZip = vi.fn();
const mockGetAadAppByClientId = vi.fn();
const mockImportAppPackage = vi.fn();
const mockCreateBot = vi.fn();
const mockGetAccount = vi.fn();
const mockGetTokenSilent = vi.fn();

vi.mock('../src/apps/index.js', () => ({
  createAadAppViaTdp: mockCreateAadAppViaTdp,
  createClientSecret: mockCreateClientSecret,
  createManifestZip: mockCreateManifestZip,
  getAadAppByClientId: mockGetAadAppByClientId,
  importAppPackage: mockImportAppPackage,
  createTdpBotHandler: vi.fn().mockReturnValue({ createBot: mockCreateBot }),
  createAzureBotHandler: vi.fn().mockReturnValue({ createBot: mockCreateBot }),
  installLink: vi.fn((id: string, tenantId: string) => `install:${id}:${tenantId}`),
  portalLink: vi.fn((id: string) => `portal:${id}`),
}));

vi.mock('../src/auth/index.js', () => ({
  getAccount: mockGetAccount,
  getTokenSilent: mockGetTokenSilent,
  graphScopes: ['graph-scope'],
  teamsDevPortalScopes: ['tdp-scope'],
}));

const baseInput: AppCreateInput = {
  name: 'Test App',
  endpoint: undefined,
  serviceManagementReference: undefined,
  signInAudience: 'AzureADMultipleOrgs',
  generateSecret: true,
  botLocation: 'tm',
  azureContext: undefined,
  description: undefined,
  scopes: undefined,
  developer: undefined,
  colorIconBuffer: undefined,
  outlineIconBuffer: undefined,
};

describe('createApp action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccount.mockResolvedValue({ tenantId: 'tenant-id' });
    mockGetTokenSilent.mockResolvedValue('token');
    mockCreateAadAppViaTdp.mockResolvedValue({ appId: 'client-id' });
    mockCreateManifestZip.mockReturnValue(Buffer.from('zip'));
    mockGetAadAppByClientId.mockResolvedValue({ id: 'aad-object-id' });
    mockCreateClientSecret.mockResolvedValue({ secretText: 'secret-text' });
    mockImportAppPackage.mockResolvedValue({ teamsAppId: 'teams-app-id' });
    mockCreateBot.mockResolvedValue(undefined);
  });

  it('creates app resources and returns credentials without Commander', async () => {
    const progress = {
      start: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };
    const { createApp } = await import('../src/commands/app/create-action.js');

    const result = await createApp(baseInput, progress);

    expect(mockCreateAadAppViaTdp).toHaveBeenCalledWith('token', 'Test App', {
      serviceManagementReference: undefined,
      signInAudience: 'AzureADMultipleOrgs',
    });
    expect(mockCreateManifestZip).toHaveBeenCalledWith(
      expect.objectContaining({
        botId: 'client-id',
        botName: 'Test App',
      })
    );
    expect(mockCreateBot).toHaveBeenCalledWith({
      botId: 'client-id',
      name: 'Test App',
      endpoint: undefined,
    });
    expect(result).toEqual({
      appName: 'Test App',
      teamsAppId: 'teams-app-id',
      botId: 'client-id',
      endpoint: null,
      installLink: 'install:teams-app-id:tenant-id',
      portalLink: 'portal:teams-app-id',
      botLocation: 'teams-managed',
      secretSkipped: false,
      credentials: {
        CLIENT_ID: 'client-id',
        CLIENT_SECRET: 'secret-text',
        TENANT_ID: 'tenant-id',
      },
    });
    expect(progress.start).toHaveBeenCalledWith('Acquiring tokens...');
    expect(progress.success).toHaveBeenCalledWith('Bot registered');
  });

  it('rejects Azure bot creation without Azure context before remote side effects', async () => {
    const { createApp } = await import('../src/commands/app/create-action.js');

    await expect(
      createApp({
        ...baseInput,
        botLocation: 'azure',
        azureContext: undefined,
      })
    ).rejects.toMatchObject({
      code: 'VALIDATION_MISSING',
      message: 'Azure context is required when creating an Azure bot.',
    });

    expect(mockGetAccount).not.toHaveBeenCalled();
    expect(mockCreateAadAppViaTdp).not.toHaveBeenCalled();
    expect(mockImportAppPackage).not.toHaveBeenCalled();
    expect(mockCreateBot).not.toHaveBeenCalled();
  });
});
