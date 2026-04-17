import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

vi.mock('../src/apps/index.js', () => ({
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
}));

vi.mock('../src/auth/index.js', () => ({
  getAccount: vi.fn().mockResolvedValue({ tenantId: 'fake-tenant-id' }),
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

// ─── Group 2: appCreateCommand via parseAsync ────────────────────────

describe('app create — JSON env-flag behavior', () => {
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
});
