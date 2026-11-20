import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppCreateInput } from '../src/commands/app/create-action.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { setTelemetry, startTelemetry } from '../src/telemetry/client.js';
import { TelemetryState } from '../src/telemetry/state.js';
import { setCancellationSignal } from '../src/utils/cancellation.js';

const mockCreateAadAppViaTdp = vi.fn();
const mockCreateClientSecret = vi.fn();
const mockCreateManifestZip = vi.fn();
const mockGetAadAppByClientId = vi.fn();
const mockImportAppPackage = vi.fn();
const mockCreateBot = vi.fn();
const mockGetAccount = vi.fn();
const mockGetTokenSilent = vi.fn();
const mockSetSocketMode = vi.fn();

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
  setSocketMode: mockSetSocketMode,
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
  socketMode: false,
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
      socketMode: false,
      socketModeError: undefined,
      secretSkipped: false,
      credentials: {
        CLIENT_ID: 'client-id',
        CLIENT_SECRET: 'secret-text',
        TENANT_ID: 'tenant-id',
      },
    });
    expect(progress.start).toHaveBeenCalledWith('Acquiring tokens...');
    expect(progress.success).toHaveBeenCalledWith('Bot registered');
    expect(mockSetSocketMode).not.toHaveBeenCalled();
  });

  it.each(['identity', 'secret', 'app', 'bot'] as const)(
    'does not create subsequent resources after cancellation during %s creation',
    async (stage) => {
      const controller = new AbortController();
      const restore = setCancellationSignal(controller.signal);
      const steps = [
        { stage: 'identity', call: mockCreateAadAppViaTdp, result: { appId: 'client-id' } },
        { stage: 'secret', call: mockCreateClientSecret, result: { secretText: 'secret-text' } },
        { stage: 'app', call: mockImportAppPackage, result: { teamsAppId: 'teams-app-id' } },
        { stage: 'bot', call: mockCreateBot, result: undefined },
      ];
      const index = steps.findIndex((step) => step.stage === stage);
      steps[index].call.mockImplementationOnce(async () => {
        controller.abort();
        return steps[index].result;
      });
      try {
        const { createApp } = await import('../src/commands/app/create-action.js');
        await expect(createApp({ ...baseInput, socketMode: true })).rejects.toMatchObject({
          name: 'AbortError',
        });
        for (const step of steps.slice(index + 1)) expect(step.call).not.toHaveBeenCalled();
        expect(mockSetSocketMode).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    }
  );

  it('enables socket mode after registering the bot', async () => {
    mockSetSocketMode.mockResolvedValue({ configuration: {}, changed: true });
    const { createApp } = await import('../src/commands/app/create-action.js');

    const result = await createApp({ ...baseInput, socketMode: true });

    expect(mockSetSocketMode).toHaveBeenCalledWith('token', 'client-id', true);
    expect(mockCreateBot.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetSocketMode.mock.invocationCallOrder[0]!
    );
    expect(result.socketMode).toBe(true);
    expect(result.socketModeError).toBeUndefined();
  });

  it('still returns the created app when enabling socket mode fails', async () => {
    mockSetSocketMode.mockRejectedValue(new Error('Failed: 403'));
    const progress = { start: vi.fn(), success: vi.fn(), error: vi.fn() };
    const { createApp } = await import('../src/commands/app/create-action.js');

    const result = await createApp({ ...baseInput, socketMode: true }, progress);

    expect(result.teamsAppId).toBe('teams-app-id');
    expect(result.socketMode).toBe(false);
    expect(result.socketModeError).toBe('Failed: 403');
    expect(progress.error).toHaveBeenCalledWith('Failed to enable socket mode');
  });

  it('enables socket mode for Azure bots after registering the bot', async () => {
    mockSetSocketMode.mockResolvedValue({ configuration: {}, changed: true });
    const { createApp } = await import('../src/commands/app/create-action.js');

    const result = await createApp({
      ...baseInput,
      socketMode: true,
      botLocation: 'azure',
      azureContext: {
        subscription: 'sub',
        resourceGroup: 'rg',
        region: 'global',
        tenantId: 'tenant-id',
      },
    });

    expect(mockSetSocketMode).toHaveBeenCalledWith('token', 'client-id', true);
    expect(mockCreateBot.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetSocketMode.mock.invocationCallOrder[0]!
    );
    expect(result.botLocation).toBe('azure');
    expect(result.socketMode).toBe(true);
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

  it('retains a confirmed app link on bot failure without claiming successful registration', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'teams-registration-telemetry-'));
    const state = new TelemetryState(join(directory, 'state.json'));
    await state.setEnrollment('on');
    const exporter = new InMemoryLogRecordExporter();
    const client = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => exporter,
    });
    setTelemetry(client);
    const teamsAppId = '22222222-2222-4222-8222-222222222222';
    const botId = '11111111-1111-4111-8111-111111111111';
    mockImportAppPackage.mockResolvedValue({ teamsAppId });
    mockCreateAadAppViaTdp.mockResolvedValue({ appId: botId });
    mockCreateBot.mockRejectedValueOnce(new Error('private service error'));
    try {
      const { createApp } = await import('../src/commands/app/create-action.js');
      await expect(createApp({ ...baseInput, generateSecret: false })).rejects.toThrow(
        'private service error'
      );
      await client.flush();
      const failed = exporter.getFinishedLogRecords();
      const links = failed.filter((record) => record.body === 'teams.cli.identity_link');
      expect(links).toHaveLength(2);
      expect(
        links.find((record) => record.attributes.registrationStage === 'identity_created')
          ?.attributes.clientId
      ).toBe(botId);
      expect(
        links.find((record) => record.attributes.registrationStage === 'app_imported')?.attributes
          .teamsAppId
      ).toBe(teamsAppId);
      expect(links.every((record) => record.attributes.botId === undefined)).toBe(true);
      expect(
        failed.find((record) => record.attributes.phase === 'completed')?.attributes.outcome
      ).toBe('failed');
      expect(JSON.stringify(failed)).not.toContain('private service error');
      exporter.reset();
      await createApp({ ...baseInput, generateSecret: false });
      await client.flush();
      expect(
        exporter
          .getFinishedLogRecords()
          .some(
            (record) =>
              record.body === 'teams.cli.identity_link' &&
              record.attributes.botId === botId &&
              record.attributes.teamsAppId === teamsAppId &&
              record.attributes.registrationStage === 'bot_registered'
          )
      ).toBe(true);
    } finally {
      await client.close();
      setTelemetry(await startTelemetry({ version: 'test', enabled: false }));
      await rm(directory, { recursive: true, force: true });
    }
  });
});
