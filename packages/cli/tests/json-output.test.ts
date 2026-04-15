import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = 'node dist/index.js';

interface TestEnv {
  TEST_APP_ID: string;
  TEST_AZ_SUBSCRIPTION?: string;
  TEST_AZ_RESOURCE_GROUP?: string;
}

function loadTestEnv(): TestEnv | null {
  const envPath = resolve(__dirname, '../.testenv');
  if (!existsSync(envPath)) return null;

  const content = readFileSync(envPath, 'utf-8');

  const appIdMatch = content.match(/^TEST_APP_ID=(.+)$/m);
  if (!appIdMatch || !appIdMatch[1] || appIdMatch[1] === 'your-app-id-here') return null;

  const subMatch = content.match(/^TEST_AZ_SUBSCRIPTION=(.+)$/m);
  const rgMatch = content.match(/^TEST_AZ_RESOURCE_GROUP=(.+)$/m);

  return {
    TEST_APP_ID: appIdMatch[1].trim(),
    TEST_AZ_SUBSCRIPTION: subMatch?.[1]?.trim(),
    TEST_AZ_RESOURCE_GROUP: rgMatch?.[1]?.trim(),
  };
}

const testEnv = loadTestEnv();
const describeWithEnv = testEnv ? describe : describe.skip;

function run(command: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; status?: number };
    return {
      stdout: execError.stdout ?? '',
      exitCode: execError.status ?? 1,
    };
  }
}

function runJson<T = Record<string, unknown>>(command: string): { data: T; exitCode: number } {
  const { stdout, exitCode } = run(command);
  return { data: JSON.parse(stdout) as T, exitCode };
}

// ── Offline validation tests (no auth needed) ────────────────────────

describe('--json validation (offline)', () => {
  describe('app update --json validation', () => {
    it('fails when --json is used without mutation flags', () => {
      const { exitCode } = run(`${CLI} app update some-app-id --json`);
      expect(exitCode).toBe(1);
    });
  });

  describe('icon validation (offline)', () => {
    const PNG_1X1 = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
      0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
      0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    it('rejects non-PNG file with INVALID_ICON error', () => {
      writeFileSync('/tmp/vitest-icon-fake.txt', 'not a png');

      const { data, exitCode } = runJson(
        `${CLI} app update some-app-id --color-icon /tmp/vitest-icon-fake.txt --json`
      );
      expect(exitCode).toBe(1);
      expect((data as Record<string, unknown>).error).toBeDefined();
      const error = (data as Record<string, { code: string; message: string }>).error;
      expect(error.code).toBe('INVALID_ICON');
      expect(error.message).toMatch(/not a valid PNG/);
    });

    it('rejects PNG with wrong dimensions', () => {
      writeFileSync('/tmp/vitest-icon-1x1.png', PNG_1X1);

      const { data, exitCode } = runJson(
        `${CLI} app update some-app-id --color-icon /tmp/vitest-icon-1x1.png --json`
      );
      expect(exitCode).toBe(1);
      const error = (data as Record<string, { code: string; message: string }>).error;
      expect(error.code).toBe('INVALID_ICON');
      expect(error.message).toMatch(/192x192px.*1x1px/);
    });

    it('rejects missing icon file', () => {
      const { data, exitCode } = runJson(
        `${CLI} app update some-app-id --color-icon /tmp/vitest-nonexistent-icon.png --json`
      );
      expect(exitCode).toBe(1);
      const error = (data as Record<string, { code: string; message: string }>).error;
      expect(error.code).toBe('INVALID_ICON');
      expect(error.message).toMatch(/not found/);
    });

    it('rejects wrong dimensions for outline icon (expects 32x32)', () => {
      writeFileSync('/tmp/vitest-icon-1x1-outline.png', PNG_1X1);

      const { data, exitCode } = runJson(
        `${CLI} app update some-app-id --outline-icon /tmp/vitest-icon-1x1-outline.png --json`
      );
      expect(exitCode).toBe(1);
      const error = (data as Record<string, { code: string; message: string }>).error;
      expect(error.code).toBe('INVALID_ICON');
      expect(error.message).toMatch(/32x32px.*1x1px/);
    });
  });
});

// ── Non-destructive tests (auth + TEST_APP_ID) ──────────────────────

describeWithEnv('--json output (requires auth)', () => {
  let appId: string;

  beforeAll(() => {
    appId = testEnv!.TEST_APP_ID;
  });

  describe('app doctor --json', () => {
    it('returns structured diagnostic checks with summary', () => {
      const { data, exitCode } = runJson(`${CLI} app doctor "${appId}" --json`);
      expect(exitCode).toBe(0);
      expect(data.appId).toBe(appId);
      expect(typeof data.appName).toBe('string');
      expect((data.appName as string).length).toBeGreaterThan(0);

      // Checks array structure
      const checks = data.checks as Array<Record<string, unknown>>;
      expect(checks).toBeInstanceOf(Array);
      expect(checks.length).toBeGreaterThan(0);

      // Each check has required fields
      for (const check of checks) {
        expect(check).toHaveProperty('category');
        expect(check).toHaveProperty('label');
        expect(check).toHaveProperty('status');
        expect(['pass', 'fail', 'warn', 'info']).toContain(check.status);
      }

      // Summary counts match checks
      const summary = data.summary as Record<string, number>;
      expect(summary.total).toBe(checks.length);
      expect(summary.pass + summary.fail + summary.warn + summary.info).toBe(summary.total);
      expect(summary.pass).toBe(checks.filter((c) => c.status === 'pass').length);
      expect(summary.fail).toBe(checks.filter((c) => c.status === 'fail').length);
    });

    it('produces no non-JSON output (no spinner leakage)', () => {
      const { stdout } = run(`${CLI} app doctor "${appId}" --json`);
      // stdout should be pure JSON — parse should succeed with no leftover
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveProperty('appId');
      // Re-stringify and compare to ensure no trailing text
      expect(stdout.trim()).toBe(JSON.stringify(parsed, null, 2));
    });
  });

  describe('app update --json', () => {
    it('returns updated fields for basic info changes', () => {
      const testDesc = `vitest-${Date.now()}`.slice(0, 80);
      const { data, exitCode } = runJson(
        `${CLI} app update "${appId}" --short-description "${testDesc}" --json`
      );
      expect(exitCode).toBe(0);
      expect(data.teamsAppId).toBe(appId);
      expect(data).toHaveProperty('updated');

      const updated = data.updated as Record<string, unknown>;
      expect(updated.shortDescription).toBe(testDesc);
    });

    it('returns multiple updated fields when multiple flags are passed', () => {
      const testName = `VT${Date.now()}`.slice(0, 30);
      const testDesc = `desc-${Date.now()}`.slice(0, 80);
      const { data, exitCode } = runJson(
        `${CLI} app update "${appId}" --name "${testName}" --short-description "${testDesc}" --json`
      );
      expect(exitCode).toBe(0);
      expect(data.teamsAppId).toBe(appId);

      const updated = data.updated as Record<string, unknown>;
      expect(updated.shortName).toBe(testName);
      expect(updated.shortDescription).toBe(testDesc);
    });

    it('returns endpoint and validDomains for endpoint changes', () => {
      const endpoint = 'https://test-vitest.example.com/api/messages';
      const { data, exitCode } = runJson(
        `${CLI} app update "${appId}" --endpoint "${endpoint}" --json`
      );
      expect(exitCode).toBe(0);
      expect(data.teamsAppId).toBe(appId);
      expect(data).toHaveProperty('botId');
      expect(typeof data.botId).toBe('string');

      const updated = data.updated as Record<string, unknown>;
      expect(updated.endpoint).toBe(endpoint);

      expect(data.validDomains).toBeInstanceOf(Array);
      expect(data.validDomains as string[]).toContain('test-vitest.example.com');
    });
  });

  describe('app auth secret create --json', () => {
    it('returns bot info and all three credential fields', () => {
      const { data, exitCode } = runJson(`${CLI} app auth secret create "${appId}" --json`);
      expect(exitCode).toBe(0);

      // Bot info
      expect(typeof data.botId).toBe('string');
      expect((data.botId as string).length).toBeGreaterThan(0);
      expect(typeof data.aadAppName).toBe('string');
      expect((data.aadAppName as string).length).toBeGreaterThan(0);

      // Credentials
      const creds = data.credentials as Record<string, string>;
      expect(creds).toHaveProperty('CLIENT_ID');
      expect(creds).toHaveProperty('CLIENT_SECRET');
      expect(creds).toHaveProperty('TENANT_ID');
      expect(creds.CLIENT_ID).toBe(data.botId);
      expect(creds.CLIENT_SECRET.length).toBeGreaterThan(10);
      expect(creds.TENANT_ID).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('produces no non-JSON output (no spinner leakage)', () => {
      const { stdout } = run(`${CLI} app auth secret create "${appId}" --json`);
      const parsed = JSON.parse(stdout);
      expect(stdout.trim()).toBe(JSON.stringify(parsed, null, 2));
    });
  });
});

// ── Lifecycle tests (auth + Azure subscription) ─────────────────────
// Creates a real app and migrates to Azure.
// Skipped if TEST_AZ_SUBSCRIPTION is not set in .testenv.

describeWithEnv('--json lifecycle (requires Azure)', () => {
  let createdAppId: string;
  let createdBotId: string;
  let hasAzure: boolean;

  beforeAll(() => {
    hasAzure = !!testEnv!.TEST_AZ_SUBSCRIPTION;
  });

  describe('app create --json', () => {
    it('returns app details with all expected fields', () => {
      const { data, exitCode } = runJson(
        `${CLI} app create --name "Vitest JSON Bot" --teams-managed --json`
      );
      expect(exitCode).toBe(0);

      expect(data.appName).toBe('Vitest JSON Bot');
      expect(typeof data.teamsAppId).toBe('string');
      expect(typeof data.botId).toBe('string');
      expect(data.endpoint).toBeNull();
      expect(data.botLocation).toBe('teams-managed');

      // Install link includes the app ID
      expect(typeof data.installLink).toBe('string');
      expect(data.installLink).toContain(data.teamsAppId as string);
      expect(data.installLink).toContain('teams.microsoft.com');

      createdAppId = data.teamsAppId as string;
      createdBotId = data.botId as string;
    });

    it('includes all three credential fields', () => {
      // Run again to also test endpoint is included when provided
      const { data, exitCode } = runJson(
        `${CLI} app create --name "Vitest EP Bot" --endpoint "https://ep.example.com/api/messages" --teams-managed --json`
      );
      expect(exitCode).toBe(0);

      expect(data.endpoint).toBe('https://ep.example.com/api/messages');

      const creds = data.credentials as Record<string, string>;
      expect(creds.CLIENT_ID).toBe(data.botId);
      expect(creds.CLIENT_SECRET.length).toBeGreaterThan(10);
      expect(creds.TENANT_ID).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('produces no non-JSON output (no spinner leakage)', () => {
      const { stdout } = run(`${CLI} app create --name "Vitest Clean Bot" --teams-managed --json`);
      const parsed = JSON.parse(stdout);
      expect(stdout.trim()).toBe(JSON.stringify(parsed, null, 2));
    });
  });

  describe('app bot migrate --json', () => {
    it('migrates bot to Azure with full output', () => {
      if (!hasAzure) return;

      const rg = testEnv!.TEST_AZ_RESOURCE_GROUP ?? 'teams-cli-test';
      const { data, exitCode } = runJson(
        `${CLI} app bot migrate "${createdAppId}" ` +
          `--subscription "${testEnv!.TEST_AZ_SUBSCRIPTION}" ` +
          `--resource-group "${rg}" ` +
          `--create-resource-group --json`
      );
      expect(exitCode).toBe(0);

      expect(data.botId).toBe(createdBotId);
      expect(data.appName).toBe('Vitest JSON Bot');
      expect(data.from).toBe('teams-managed');
      expect(data.to).toBe('azure');
      expect(data.subscription).toBe(testEnv!.TEST_AZ_SUBSCRIPTION);
      expect(data.resourceGroup).toBe(rg);
      expect(data.warnings).toBeInstanceOf(Array);
      // Endpoint was null at creation
      expect(data.endpoint).toBeNull();
    });

    it('returns already_in_azure status for Azure bots', () => {
      if (!hasAzure) return;

      const rg = testEnv!.TEST_AZ_RESOURCE_GROUP ?? 'teams-cli-test';
      const { data, exitCode } = runJson(
        `${CLI} app bot migrate "${createdAppId}" ` +
          `--subscription "${testEnv!.TEST_AZ_SUBSCRIPTION}" ` +
          `--resource-group "${rg}" --json`
      );
      expect(exitCode).toBe(0);
      expect(data.status).toBe('already_in_azure');
      expect(data.botId).toBe(createdBotId);
    });

    it('produces no non-JSON output (no spinner leakage)', () => {
      if (!hasAzure) return;

      const rg = testEnv!.TEST_AZ_RESOURCE_GROUP ?? 'teams-cli-test';
      const { stdout } = run(
        `${CLI} app bot migrate "${createdAppId}" ` +
          `--subscription "${testEnv!.TEST_AZ_SUBSCRIPTION}" ` +
          `--resource-group "${rg}" --json`
      );
      const parsed = JSON.parse(stdout);
      expect(stdout.trim()).toBe(JSON.stringify(parsed, null, 2));
    });
  });
});
