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

  it('writes AzureAd env vars into the first profile, preserving existing vars', () => {
    const filePath = tmpFile('launchSettings.json');
    files.push(filePath);
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        profiles: {
          http: {
            commandName: 'Project',
            applicationUrl: 'http://localhost:3978',
            environmentVariables: { ASPNETCORE_ENVIRONMENT: 'Staging' },
          },
        },
      })
    );

    writeLaunchSettingsCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const env = json.profiles.http.environmentVariables;
    expect(env.ASPNETCORE_ENVIRONMENT).toBe('Staging');
    expect(env.AzureAd__ClientId).toBe('test-client-id');
    expect(env.AzureAd__ClientCredentials__0__SourceType).toBe('ClientSecret');
    expect(env.AzureAd__ClientCredentials__0__ClientSecret).toBe('test-client-secret');
    expect(env.AzureAd__TenantId).toBe('test-tenant-id');
    expect(env.DOTNET_ENVIRONMENT).toBe('Staging');
    expect(env).not.toHaveProperty('AzureAd__Instance');
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
    expect(json.profiles.http.environmentVariables.AzureAd__ClientId).toBe('test-client-id');
    expect(json.profiles.https.environmentVariables).toEqual({});
  });

  it('omits client secret configuration when the secret is undefined', () => {
    const filePath = tmpFile('launchSettings.json');
    files.push(filePath);
    fs.writeFileSync(
      filePath,
      JSON.stringify({ profiles: { http: { environmentVariables: {} } } })
    );

    writeLaunchSettingsCredentials(filePath, { CLIENT_ID: 'id-123', TENANT_ID: 'tenant-456' });

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const env = json.profiles.http.environmentVariables;
    expect(env.AzureAd__ClientId).toBe('id-123');
    expect(env.AzureAd__TenantId).toBe('tenant-456');
    expect(env).not.toHaveProperty('AzureAd__ClientCredentials__0__ClientSecret');
    expect(env).not.toHaveProperty('AzureAd__ClientCredentials__0__SourceType');
  });

  it('creates a minimal launchSettings.json when the file does not exist', () => {
    const filePath = tmpFile('launchSettings.json');
    files.push(filePath);

    writeLaunchSettingsCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(json).toEqual({
      profiles: {
        Development: {
          commandName: 'Project',
          environmentVariables: {
            DOTNET_ENVIRONMENT: 'Development',
            AzureAd__TenantId: 'test-tenant-id',
            AzureAd__ClientId: 'test-client-id',
            AzureAd__ClientCredentials__0__SourceType: 'ClientSecret',
            AzureAd__ClientCredentials__0__ClientSecret: 'test-client-secret',
          },
        },
      },
    });
  });

  it('creates the parent directory when it does not exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-launch-'));
    tmpDirs.push(dir);
    // Properties/ does not exist yet — the picker advertises "(will be created)".
    const filePath = path.join(dir, 'Properties', 'launchSettings.json');

    writeLaunchSettingsCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const firstProfile = json.profiles[Object.keys(json.profiles)[0]];
    expect(firstProfile.environmentVariables.AzureAd__ClientId).toBe('test-client-id');
  });

  it('migrates legacy credentials and removes a stale secret when the secret is undefined', () => {
    const filePath = tmpFile('launchSettings.json');
    files.push(filePath);
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        profiles: {
          http: {
            environmentVariables: {
              Teams__ClientId: 'old-id',
              Teams__ClientSecret: 'stale-secret',
              Teams__TenantId: 'old-tenant',
              AzureAd__ClientId: 'old-id',
              AzureAd__TenantId: 'old-tenant',
              AzureAd__ClientCredentials__0__SourceType: 'ClientSecret',
              AzureAd__ClientCredentials__0__ClientSecret: 'stale-secret',
              AZUREAD__CLIENTCREDENTIALS__0__CLIENTSECRET: 'uppercase-secret',
              AzureAd__ClientCredentials__1__SourceType: 'clientsecret',
              AzureAd__ClientCredentials__1__ClientSecret: 'second-secret',
              AZUREAD__CLIENTCREDENTIALS__2__SOURCETYPE: 'CLIENTSECRET',
              AZUREAD__CLIENTCREDENTIALS__2__CLIENTSECRET: 'third-secret',
              AzureAd__ClientCredentials__3__SourceType: 'ManagedIdentity',
              AzureAd__ClientCredentials__4__SourceType: 'KeyVault',
              AzureAd__ClientCredentials__4__KeyVaultUrl: 'https://example.vault.azure.net/',
              TEAMS__CLIENTSECRET: 'legacy-uppercase-secret',
            },
          },
        },
      })
    );

    writeLaunchSettingsCredentials(filePath, { CLIENT_ID: 'id-123', TENANT_ID: 'tenant-456' });

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const env = json.profiles.http.environmentVariables;
    expect(env.AzureAd__ClientId).toBe('id-123');
    expect(env.AzureAd__TenantId).toBe('tenant-456');
    expect(env).not.toHaveProperty('Teams__ClientId');
    expect(env).not.toHaveProperty('Teams__ClientSecret');
    expect(env).not.toHaveProperty('Teams__TenantId');
    expect(env).not.toHaveProperty('AzureAd__ClientCredentials__0__ClientSecret');
    expect(env).not.toHaveProperty('AzureAd__ClientCredentials__0__SourceType');
    expect(env).toEqual({
      DOTNET_ENVIRONMENT: 'Development',
      AzureAd__ClientId: 'id-123',
      AzureAd__TenantId: 'tenant-456',
      AzureAd__ClientCredentials__3__SourceType: 'ManagedIdentity',
      AzureAd__ClientCredentials__4__SourceType: 'KeyVault',
      AzureAd__ClientCredentials__4__KeyVaultUrl: 'https://example.vault.azure.net/',
    });
  });

  it('replaces legacy credentials while preserving custom environment and cloud settings', () => {
    const filePath = tmpFile('launchSettings.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        profiles: {
          SocketModeBot: {
            commandName: 'Project',
            environmentVariables: {
              DOTNET_ENVIRONMENT: 'Staging',
              AzureAd__Instance: 'https://login.microsoftonline.us/',
              Teams__ClientId: 'old-id',
              Teams__ClientSecret: 'old-secret',
              Teams__TenantId: 'old-tenant',
              AzureAd__ClientCredentials__0__ClientSecret: 'old-secret',
              AzureAd__ClientCredentials__1__SourceType: 'KeyVault',
            },
          },
        },
      })
    );

    writeLaunchSettingsCredentials(filePath, TEST_VALUES);

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(json.profiles.SocketModeBot.environmentVariables).toEqual({
      DOTNET_ENVIRONMENT: 'Staging',
      AzureAd__Instance: 'https://login.microsoftonline.us/',
      AzureAd__ClientId: 'test-client-id',
      AzureAd__TenantId: 'test-tenant-id',
      AzureAd__ClientCredentials__0__SourceType: 'ClientSecret',
      AzureAd__ClientCredentials__0__ClientSecret: 'test-client-secret',
      AzureAd__ClientCredentials__1__SourceType: 'KeyVault',
    });
  });

  it('preserves a non-secret credential source when no secret is provided', () => {
    const filePath = tmpFile('launchSettings.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        profiles: {
          SocketModeBot: {
            environmentVariables: {
              AzureAd__ClientCredentials__0__SourceType: 'ManagedIdentity',
            },
          },
        },
      })
    );

    writeLaunchSettingsCredentials(filePath, { CLIENT_ID: 'id-123', TENANT_ID: 'tenant-456' });

    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(
      json.profiles.SocketModeBot.environmentVariables.AzureAd__ClientCredentials__0__SourceType
    ).toBe('ManagedIdentity');
  });

  it.each(['{', '[]', 'null'])(
    'rejects invalid JSON input %s without modifying the file',
    (content: string) => {
      const filePath = tmpFile('launchSettings.json');
      fs.writeFileSync(filePath, content);

      expect(() => writeLaunchSettingsCredentials(filePath, TEST_VALUES)).toThrow();
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    }
  );
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
    expect(json.profiles.http.environmentVariables.AzureAd__ClientId).toBe('test-client-id');
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
