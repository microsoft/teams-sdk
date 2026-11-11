import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function tmpFile(name: string): string {
  return path.join(os.tmpdir(), `vitest-env-flag-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
}

// ─── shared constants ────────────────────────────────────────────────

const FAKE_CLIENT_ID = 'fake-client-id';
const FAKE_SECRET = 'fake-secret-text';
const FAKE_TENANT_ID = 'fake-tenant-id';
const FAKE_TEAMS_APP_ID = 'fake-teams-app-id';

// ─── mocks (top-level, as vitest requires) ───────────────────────────

vi.mock('../src/apps/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/apps/index.js')>();
  return {
    ...actual,
    fetchApp: vi.fn().mockResolvedValue({
      bots: [{ botId: 'fake-client-id' }],
    }),
    getAadAppByClientId: vi.fn().mockResolvedValue({
      id: 'aad-object-id',
      appId: 'fake-client-id',
      displayName: 'TestAadApp',
    }),
    createClientSecret: vi.fn().mockResolvedValue({ secretText: 'fake-secret-text' }),
    createAadAppViaTdp: vi.fn().mockResolvedValue({
      id: 'aad-object-id',
      appId: 'fake-client-id',
      displayName: 'TestAadApp',
    }),
    createManifestZip: vi.fn().mockReturnValue(Buffer.from('fake-zip')),
    importAppPackage: vi.fn().mockResolvedValue({ teamsAppId: 'fake-teams-app-id' }),
    createTdpBotHandler: vi.fn().mockReturnValue({
      createBot: vi.fn().mockResolvedValue(undefined),
    }),
    installLink: vi.fn((id: string, tenantId: string) => `https://teams.microsoft.com/l/app/${id}?installAppPackage=true&appTenantId=${tenantId}`),
    portalLink: vi.fn((id: string) => `https://dev.teams.microsoft.com/apps/${id}`),
  };
});

vi.mock('../src/auth/index.js', () => ({
  getAccount: vi.fn().mockResolvedValue({ tenantId: 'fake-tenant-id' }),
  getTokenSilent: vi.fn().mockResolvedValue('fake-token'),
  graphScopes: ['https://graph.microsoft.com/.default'],
  teamsDevPortalScopes: ['https://dev.teams.microsoft.com/.default'],
}));

vi.mock('../src/commands/agent/shared.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/commands/agent/shared.js')>(),
  requireAgentAccount: vi.fn(async () => ({
    homeAccountId: 'fake-home-id',
    environment: 'login.microsoftonline.com',
    tenantId: FAKE_TENANT_ID,
    username: 'user@contoso.com',
    localAccountId: 'fake-owner-id',
  })),
}));

vi.mock('../src/commands/agent/user/actions.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/commands/agent/user/actions.js')>(),
  runCreateAgentIdentity: vi.fn(async () => ({ agentIdentityId: 'identity-id' })),
  runCreateAgenticUser: vi.fn(async () => ({
    agenticUserId: 'user-id',
    userPrincipalName: 'test-agent@contoso.com',
    needsLicense: true,
  })),
}));

vi.mock('../src/apps/graph.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/apps/graph.js')>(),
  getAadAppByClientId: vi.fn(),
  getServicePrincipalByAppId: vi.fn(),
  addBlueprintSecret: vi.fn(),
}));

vi.mock('../src/utils/az.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/utils/az.js')>(),
  getAzAccessToken: vi.fn().mockRejectedValue(new Error('Unexpected blueprint credential minting')),
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

vi.mock('nanospinner', () => ({
  createSpinner: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../src/utils/config.js', () => ({
  getConfig: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/utils/browser.js', () => ({
  printLinkBanner: vi.fn(),
  openInBrowser: vi.fn(),
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

// ─── Group 1: generateSecret ─────────────────────────────────────────

describe('generateSecret — JSON env-flag behavior', () => {
  const files: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    jsonOutput = null;
  });

  afterEach(() => {
    for (const f of files) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    files.length = 0;
  });

  it('json: true without envPath — credentials in JSON output, no credentialsFile', async () => {
    const { generateSecret } = await import(
      '../src/commands/app/auth/secret/generate.js'
    );

    await generateSecret({
      tdpToken: 'fake-tdp-token',
      appId: 'test-app-id',
      json: true,
    });

    expect(jsonOutput).not.toBeNull();
    const output = jsonOutput as Record<string, unknown>;
    expect(output.credentials).toEqual({
      CLIENT_ID: FAKE_CLIENT_ID,
      CLIENT_SECRET: FAKE_SECRET,
      TENANT_ID: FAKE_TENANT_ID,
    });
    expect(output).not.toHaveProperty('credentialsFile');
    expect(output.botId).toBe(FAKE_CLIENT_ID);
    expect(output.aadAppName).toBe('TestAadApp');
  });

  it('json: true with envPath (.env) — credentialsFile in JSON, no credentials, file written', async () => {
    const envFile = tmpFile('.env');
    files.push(envFile);

    const { generateSecret } = await import(
      '../src/commands/app/auth/secret/generate.js'
    );

    await generateSecret({
      tdpToken: 'fake-tdp-token',
      appId: 'test-app-id',
      json: true,
      envPath: envFile,
    });

    // JSON output should have credentialsFile, not credentials
    expect(jsonOutput).not.toBeNull();
    const output = jsonOutput as Record<string, unknown>;
    expect(output.credentialsFile).toBe(envFile);
    expect(output).not.toHaveProperty('credentials');

    // .env file should exist with correct content
    const content = fs.readFileSync(envFile, 'utf-8');
    expect(content).toContain(`CLIENT_ID=${FAKE_CLIENT_ID}`);
    expect(content).toContain(`CLIENT_SECRET=${FAKE_SECRET}`);
    expect(content).toContain(`TENANT_ID=${FAKE_TENANT_ID}`);
  });

  it('json: true with envPath (.json) — credentialsFile in JSON, no credentials, appsettings written', async () => {
    const jsonFile = tmpFile('appsettings.json');
    files.push(jsonFile);

    const { generateSecret } = await import(
      '../src/commands/app/auth/secret/generate.js'
    );

    await generateSecret({
      tdpToken: 'fake-tdp-token',
      appId: 'test-app-id',
      json: true,
      envPath: jsonFile,
    });

    // JSON output should have credentialsFile, not credentials
    expect(jsonOutput).not.toBeNull();
    const output = jsonOutput as Record<string, unknown>;
    expect(output.credentialsFile).toBe(jsonFile);
    expect(output).not.toHaveProperty('credentials');

    // appsettings.json should have Teams section
    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    expect(json.Teams).toEqual({
      ClientId: FAKE_CLIENT_ID,
      ClientSecret: FAKE_SECRET,
      TenantId: FAKE_TENANT_ID,
    });
  });
});

// ─── Group 2: create commands via parseAsync ────────────────────────

describe('app and agent user create — credential destinations', () => {
  const files: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    jsonOutput = null;
  });

  afterEach(() => {
    for (const f of files) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    files.length = 0;
    mockExit.mockClear();
  });

  it('--json without --env — credentials in JSON output, no credentialsFile', async () => {
    const { appCreateCommand } = await import(
      '../src/commands/app/create.js'
    );

    await appCreateCommand.parseAsync(
      ['--name', 'TestApp', '--json'],
      { from: 'user' }
    );

    expect(jsonOutput).not.toBeNull();
    const output = jsonOutput as Record<string, unknown>;
    expect(output.credentials).toEqual({
      CLIENT_ID: FAKE_CLIENT_ID,
      CLIENT_SECRET: FAKE_SECRET,
      TENANT_ID: FAKE_TENANT_ID,
    });
    expect(output).not.toHaveProperty('credentialsFile');
    expect(output.appName).toBe('TestApp');
    expect(output.teamsAppId).toBe(FAKE_TEAMS_APP_ID);
    expect(output.botId).toBe(FAKE_CLIENT_ID);
  });

  it('--json --env <path.json> — credentialsFile in JSON, no credentials, file written', async () => {
    const jsonFile = tmpFile('appsettings.json');
    files.push(jsonFile);

    const { appCreateCommand } = await import(
      '../src/commands/app/create.js'
    );

    await appCreateCommand.parseAsync(
      ['--name', 'TestApp', '--json', '--env', jsonFile],
      { from: 'user' }
    );

    // JSON output should have credentialsFile, not credentials
    expect(jsonOutput).not.toBeNull();
    const output = jsonOutput as Record<string, unknown>;
    expect(output.credentialsFile).toBe(jsonFile);
    expect(output).not.toHaveProperty('credentials');
    expect(output.appName).toBe('TestApp');

    // appsettings.json should have Teams section
    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    expect(json.Teams).toEqual({
      ClientId: FAKE_CLIENT_ID,
      ClientSecret: FAKE_SECRET,
      TenantId: FAKE_TENANT_ID,
    });
  });

  it.each([
    { explicit: false, filename: 'appsettings.json', lineEnding: '\n' },
    { explicit: true, filename: 'appsettings.Development.json', lineEnding: '\r\n' },
  ])('agent user create reuses .env credentials for $filename (explicit: $explicit)', async ({ explicit, filename, lineEnding }) => {
    const originalCwd = process.cwd();
    const tempDir = tmpFile('agent-create');
    fs.mkdirSync(path.join(tempDir, 'MyAgent'), { recursive: true });

    try {
      process.chdir(tempDir);
      vi.resetModules();
      const { writeGeneratedConfig } = await import('../src/apps/agent-config.js');
      writeGeneratedConfig(tempDir, {
        agentBlueprintId: FAKE_CLIENT_ID,
        agentBlueprintObjectId: 'blueprint-object-id',
        agentBlueprintServicePrincipalObjectId: 'blueprint-principal-id',
        agentBlueprintName: 'Test Agent',
        completedAt: '2026-01-01T00:00:00.000Z',
      });
      fs.writeFileSync('.env', [
        `CLIENT_ID=${FAKE_CLIENT_ID}`,
        `CLIENT_SECRET=${FAKE_SECRET}`,
        `TENANT_ID=${FAKE_TENANT_ID}`,
        '',
      ].join(lineEnding));
      fs.writeFileSync(path.join('MyAgent', 'MyAgent.csproj'), '<Project />');
      const destination = path.join('MyAgent', filename);
      const { agentUserCreateCommand } = await import('../src/commands/agent/user/create.js');
      const { runCreateAgentIdentity } = await import('../src/commands/agent/user/actions.js');
      const { getAzAccessToken } = await import('../src/utils/az.js');

      await agentUserCreateCommand.parseAsync(
        [
          FAKE_CLIENT_ID, '--no-license', '--usage-location', 'US',
          ...(explicit ? ['--env', destination, '--json'] : []),
        ],
        { from: 'user' }
      );

      expect(JSON.parse(fs.readFileSync(destination, 'utf8'))).toEqual({
        AzureAd: {
          ClientId: FAKE_CLIENT_ID,
          TenantId: FAKE_TENANT_ID,
          ClientCredentials: [{ SourceType: 'ClientSecret', ClientSecret: FAKE_SECRET }],
        },
      });
      expect(fs.readFileSync('.env', 'utf8')).toContain(`CLIENT_SECRET=${FAKE_SECRET}`);
      expect(fs.readFileSync('.gitignore', 'utf8')).toContain(`MyAgent/${filename}`);
      expect(getAzAccessToken).not.toHaveBeenCalled();
      expect(runCreateAgentIdentity).toHaveBeenCalledWith(
        'Test Agent', FAKE_CLIENT_ID, FAKE_SECRET,
        expect.objectContaining({ tenantId: FAKE_TENANT_ID }), explicit
      );
      if (explicit) {
        expect(jsonOutput).toEqual(expect.objectContaining({ credentialsFile: destination }));
        expect(jsonOutput).not.toHaveProperty('secretMinted');
      }
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects a regular app before minting a secret or overwriting local credentials', async () => {
    const tempDir = tmpFile('not-blueprint');
    fs.mkdirSync(tempDir);
    const envPath = path.join(tempDir, '.env');
    const originalEnv = 'CLIENT_ID=unrelated-app\nCLIENT_SECRET=keep-existing-secret\n';
    fs.writeFileSync(envPath, originalEnv);

    try {
      vi.resetModules();
      const { getAzAccessToken } = await import('../src/utils/az.js');
      const { getAadAppByClientId, getServicePrincipalByAppId, addBlueprintSecret } = await import('../src/apps/graph.js');
      const { runAgentUserCreate } = await import('../src/commands/agent/user/create.js');
      vi.mocked(getAzAccessToken).mockResolvedValueOnce('admin-token');
      vi.mocked(getAadAppByClientId).mockResolvedValueOnce({
        id: 'regular-app-object', appId: FAKE_CLIENT_ID, displayName: 'Regular App',
      });
      vi.mocked(getServicePrincipalByAppId).mockResolvedValue({ id: 'regular-app-principal' });
      vi.mocked(addBlueprintSecret).mockResolvedValue({
        secretText: 'unexpected-secret', displayName: 'default', endDateTime: '2028-01-01T00:00:00Z',
      });

      await expect(runAgentUserCreate(FAKE_CLIENT_ID, {
        cwd: tempDir, json: true, license: false, usageLocation: 'US',
      })).rejects.toMatchObject({
        code: 'AGENT_BLUEPRINT_NOT_FOUND',
        message: expect.stringContaining('not an Agent 365 blueprint'),
      });

      expect(getServicePrincipalByAppId).not.toHaveBeenCalled();
      expect(addBlueprintSecret).not.toHaveBeenCalled();
      expect(fs.readFileSync(envPath, 'utf8')).toBe(originalEnv);
      expect(fs.readdirSync(tempDir)).toEqual(['.env']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('mints and saves a secret for a verified blueprint when no local credentials exist', async () => {
    const tempDir = tmpFile('verified-blueprint');
    fs.mkdirSync(tempDir);

    try {
      vi.resetModules();
      const { getAzAccessToken } = await import('../src/utils/az.js');
      const { getAadAppByClientId, getServicePrincipalByAppId, addBlueprintSecret } = await import('../src/apps/graph.js');
      const { runAgentUserCreate } = await import('../src/commands/agent/user/create.js');
      vi.mocked(getAzAccessToken).mockResolvedValueOnce('admin-token');
      vi.mocked(getAadAppByClientId).mockResolvedValueOnce({
        id: 'blueprint-object-id',
        appId: FAKE_CLIENT_ID,
        displayName: 'Verified Blueprint',
        '@odata.type': '#microsoft.graph.agentIdentityBlueprint',
      });
      vi.mocked(getServicePrincipalByAppId).mockResolvedValueOnce({ id: 'blueprint-principal-id' });
      vi.mocked(addBlueprintSecret).mockResolvedValueOnce({
        secretText: FAKE_SECRET, displayName: 'default', endDateTime: '2028-01-01T00:00:00Z',
      });

      const output = await runAgentUserCreate(FAKE_CLIENT_ID, {
        cwd: tempDir, json: true, license: false, usageLocation: 'US',
      });

      expect(output.secretMinted).toBe(true);
      expect(getAzAccessToken).toHaveBeenCalledExactlyOnceWith('https://graph.microsoft.com', FAKE_TENANT_ID);
      expect(addBlueprintSecret).toHaveBeenCalledExactlyOnceWith('admin-token', 'blueprint-object-id');
      expect(fs.readFileSync(path.join(tempDir, '.env'), 'utf8')).toContain(`CLIENT_SECRET=${FAKE_SECRET}`);
      const { readGeneratedConfig } = await import('../src/apps/agent-config.js');
      expect(readGeneratedConfig(tempDir)).toMatchObject({
        agentBlueprintId: FAKE_CLIENT_ID,
        agentBlueprintObjectId: 'blueprint-object-id',
        agentBlueprintServicePrincipalObjectId: 'blueprint-principal-id',
        agentBlueprintName: 'Verified Blueprint',
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Must be last — --no-secret sets Commander state that persists on the shared Command instance
  it('--json --no-secret --env — secretSkipped true, file has no CLIENT_SECRET', async () => {
    const envFile = tmpFile('.env');
    files.push(envFile);

    const { appCreateCommand } = await import(
      '../src/commands/app/create.js'
    );

    await appCreateCommand.parseAsync(
      ['--name', 'TestApp', '--json', '--no-secret', '--env', envFile],
      { from: 'user' }
    );

    expect(jsonOutput).not.toBeNull();
    const output = jsonOutput as Record<string, unknown>;
    expect(output.secretSkipped).toBe(true);
    expect(output.credentialsFile).toBe(envFile);
    expect(output).not.toHaveProperty('credentials');

    // .env file should have CLIENT_ID and TENANT_ID but no CLIENT_SECRET
    const content = fs.readFileSync(envFile, 'utf-8');
    expect(content).toContain(`CLIENT_ID=${FAKE_CLIENT_ID}`);
    expect(content).toContain(`TENANT_ID=${FAKE_TENANT_ID}`);
    expect(content).not.toContain('CLIENT_SECRET');
  });
});
