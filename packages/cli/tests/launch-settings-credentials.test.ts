import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  writeLaunchSettingsCredentials,
  writeCredentials,
  isLaunchSettingsFile,
  type EnvValues,
} from '../src/utils/env.js';

const TEST_VALUES: EnvValues = {
  CLIENT_ID: 'test-client-id',
  CLIENT_SECRET: 'test-client-secret',
  TENANT_ID: 'test-tenant-id',
};

const tmpDirs: string[] = [];

/** Create a file with an exact basename inside a fresh temp dir. */
function tmpFile(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-launch-'));
  tmpDirs.push(dir);
  return path.join(dir, name);
}

afterEach(() => {
  for (const d of tmpDirs) {
    fs.rmSync(d, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

// ── isLaunchSettingsFile ─────────────────────────────────────────────

describe('isLaunchSettingsFile', () => {
  it('matches launchSettings.json regardless of case or directory', () => {
    expect(isLaunchSettingsFile('Properties/launchSettings.json')).toBe(true);
    expect(isLaunchSettingsFile('launchsettings.json')).toBe(true);
    expect(isLaunchSettingsFile(path.join('a', 'b', 'LaunchSettings.JSON'))).toBe(true);
  });

  it('does not match appsettings.json or .env', () => {
    expect(isLaunchSettingsFile('appsettings.json')).toBe(false);
    expect(isLaunchSettingsFile('.env')).toBe(false);
  });
});

// ── writeLaunchSettingsCredentials ───────────────────────────────────

describe('writeLaunchSettingsCredentials', () => {
  const files: string[] = [];

  afterEach(() => {
    for (const f of files) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    files.length = 0;
  });

  it('writes Teams__ env vars into the first profile, preserving existing vars', () => {
    const filePath = tmpFile('launchSettings.json');
    files.push(filePath);
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        profiles: {
          http: {
            commandName: 'Project',
            applicationUrl: 'http://localhost:3978',
            environmentVariables: { ASPNETCORE_ENVIRONMENT: 'Development' },
          },
        },
      })
    );

    writeLaunchSettingsCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const env = json.profiles.http.environmentVariables;
    expect(env.ASPNETCORE_ENVIRONMENT).toBe('Development');
    expect(env.Teams__ClientId).toBe('test-client-id');
    expect(env.Teams__ClientSecret).toBe('test-client-secret');
    expect(env.Teams__TenantId).toBe('test-tenant-id');
    // profile shape preserved
    expect(json.profiles.http.commandName).toBe('Project');
    expect(json.profiles.http.applicationUrl).toBe('http://localhost:3978');
  });

  it('writes only into the first profile, leaving other profiles untouched', () => {
    const filePath = tmpFile('launchSettings.json');
    files.push(filePath);
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        profiles: {
          http: { commandName: 'Project', environmentVariables: {} },
          https: { commandName: 'Project', environmentVariables: {} },
        },
      })
    );

    writeLaunchSettingsCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(json.profiles.http.environmentVariables.Teams__ClientId).toBe('test-client-id');
    expect(json.profiles.https.environmentVariables).not.toHaveProperty('Teams__ClientId');
  });

  it('omits Teams__ClientSecret when the secret is undefined', () => {
    const filePath = tmpFile('launchSettings.json');
    files.push(filePath);
    fs.writeFileSync(
      filePath,
      JSON.stringify({ profiles: { http: { environmentVariables: {} } } })
    );

    writeLaunchSettingsCredentials(filePath, { CLIENT_ID: 'id-123', TENANT_ID: 'tenant-456' });

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const env = json.profiles.http.environmentVariables;
    expect(env.Teams__ClientId).toBe('id-123');
    expect(env.Teams__TenantId).toBe('tenant-456');
    expect(env).not.toHaveProperty('Teams__ClientSecret');
  });

  it('creates a minimal launchSettings.json when the file does not exist', () => {
    const filePath = tmpFile('launchSettings.json');
    files.push(filePath);

    writeLaunchSettingsCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const firstProfile = json.profiles[Object.keys(json.profiles)[0]];
    expect(firstProfile.environmentVariables.Teams__ClientId).toBe('test-client-id');
    expect(firstProfile.environmentVariables.Teams__ClientSecret).toBe('test-client-secret');
    expect(firstProfile.environmentVariables.Teams__TenantId).toBe('test-tenant-id');
  });
});

// ── writeCredentials (dispatch) ──────────────────────────────────────

describe('writeCredentials dispatch', () => {
  const files: string[] = [];

  afterEach(() => {
    for (const f of files) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    files.length = 0;
  });

  it('routes launchSettings.json to profile env vars, not a root Teams section', () => {
    const filePath = tmpFile('launchSettings.json');
    files.push(filePath);
    fs.writeFileSync(filePath, JSON.stringify({ profiles: { http: { environmentVariables: {} } } }));

    writeCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(json).not.toHaveProperty('Teams');
    expect(json.profiles.http.environmentVariables.Teams__ClientId).toBe('test-client-id');
  });

  it('routes other .json files to the Teams section', () => {
    const filePath = tmpFile('appsettings.json');
    files.push(filePath);

    writeCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(json.Teams).toEqual({
      ClientId: 'test-client-id',
      ClientSecret: 'test-client-secret',
      TenantId: 'test-tenant-id',
    });
  });

  it('routes non-JSON files to .env format', () => {
    const filePath = tmpFile('.env');
    files.push(filePath);

    writeCredentials(filePath, TEST_VALUES);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('CLIENT_ID=test-client-id');
    expect(content).toContain('CLIENT_SECRET=test-client-secret');
    expect(content).toContain('TENANT_ID=test-tenant-id');
  });
});
