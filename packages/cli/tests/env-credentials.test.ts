import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { writeEnvFile, writeJsonCredentials, outputCredentials, type EnvValues } from '../src/utils/env.js';

const TEST_VALUES: EnvValues = {
  CLIENT_ID: 'test-client-id',
  CLIENT_SECRET: 'test-client-secret',
  TENANT_ID: 'test-tenant-id',
};

function tmpFile(name: string): string {
  return path.join(os.tmpdir(), `vitest-env-${Date.now()}-${name}`);
}

// ── writeEnvFile ─────────────────────────────────────────────────────

describe('writeEnvFile', () => {
  const files: string[] = [];

  afterEach(() => {
    for (const f of files) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    files.length = 0;
  });

  it('writes credentials to a new .env file', () => {
    const filePath = tmpFile('.env');
    files.push(filePath);

    writeEnvFile(filePath, TEST_VALUES);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('CLIENT_ID=test-client-id');
    expect(content).toContain('CLIENT_SECRET=test-client-secret');
    expect(content).toContain('TENANT_ID=test-tenant-id');
  });

  it('merges into an existing .env file, preserving other vars', () => {
    const filePath = tmpFile('.env');
    files.push(filePath);
    fs.writeFileSync(filePath, 'PORT=3000\nDATABASE_URL=postgres://localhost\n');

    writeEnvFile(filePath, TEST_VALUES);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('PORT=3000');
    expect(content).toContain('DATABASE_URL=postgres://localhost');
    expect(content).toContain('CLIENT_ID=test-client-id');
  });

  it('updates existing keys in a .env file', () => {
    const filePath = tmpFile('.env');
    files.push(filePath);
    fs.writeFileSync(filePath, 'CLIENT_ID=old-value\nOTHER=keep\n');

    writeEnvFile(filePath, TEST_VALUES);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('CLIENT_ID=test-client-id');
    expect(content).not.toContain('CLIENT_ID=old-value');
    expect(content).toContain('OTHER=keep');
  });
});

// ── writeJsonCredentials ─────────────────────────────────────────────

describe('writeJsonCredentials', () => {
  const files: string[] = [];

  afterEach(() => {
    for (const f of files) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    files.length = 0;
  });

  it('creates a new JSON file with Teams section when file does not exist', () => {
    const filePath = tmpFile('appsettings.json');
    files.push(filePath);

    writeJsonCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(json.Teams).toEqual({
      ClientId: 'test-client-id',
      ClientSecret: 'test-client-secret',
      TenantId: 'test-tenant-id',
    });
  });

  it('merges into existing JSON, preserving other top-level keys', () => {
    const filePath = tmpFile('appsettings.json');
    files.push(filePath);
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          Logging: { LogLevel: { Default: 'Information' } },
          AllowedHosts: '*',
        },
        null,
        2
      )
    );

    writeJsonCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(json.Logging).toEqual({ LogLevel: { Default: 'Information' } });
    expect(json.AllowedHosts).toBe('*');
    expect(json.Teams.ClientId).toBe('test-client-id');
  });

  it('preserves sibling keys under existing Teams section', () => {
    const filePath = tmpFile('appsettings.json');
    files.push(filePath);
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          Teams: { AppId: 'existing-app-id', ClientId: 'old-client-id' },
        },
        null,
        2
      )
    );

    writeJsonCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(json.Teams.AppId).toBe('existing-app-id');
    expect(json.Teams.ClientId).toBe('test-client-id');
    expect(json.Teams.ClientSecret).toBe('test-client-secret');
    expect(json.Teams.TenantId).toBe('test-tenant-id');
  });
});

// ── outputCredentials (format dispatch) ──────────────────────────────

vi.mock('../src/utils/spinner.js', () => ({
  createSilentSpinner: () => ({
    start: () => ({ success: vi.fn() }),
  }),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('outputCredentials', () => {
  const files: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const f of files) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    files.length = 0;
  });

  it('writes .env format for paths ending in .env', () => {
    const filePath = tmpFile('.env');
    files.push(filePath);

    outputCredentials(filePath, TEST_VALUES, 'Done!');

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('CLIENT_ID=test-client-id');
    expect(content).toContain('CLIENT_SECRET=test-client-secret');
    expect(content).toContain('TENANT_ID=test-tenant-id');
  });

  it('writes JSON format for paths ending in .json', () => {
    const filePath = tmpFile('appsettings.json');
    files.push(filePath);

    outputCredentials(filePath, TEST_VALUES, 'Done!');

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(json.Teams).toEqual({
      ClientId: 'test-client-id',
      ClientSecret: 'test-client-secret',
      TenantId: 'test-tenant-id',
    });
  });

  it('prints to terminal when no path is given', async () => {
    const { logger } = await import('../src/utils/logger.js');

    outputCredentials(undefined, TEST_VALUES, 'Credentials:');

    expect(logger.info).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});
