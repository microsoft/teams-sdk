import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { setTelemetry, startTelemetry, type TelemetryClient } from '../src/telemetry/client.js';
import { TelemetryState } from '../src/telemetry/state.js';

const mocks = vi.hoisted(() => ({ getAccount: vi.fn(), login: vi.fn(), environment: vi.fn() }));
vi.mock('../src/auth/index.js', () => ({ getAccount: mocks.getAccount, login: mocks.login }));
vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../src/utils/interactive.js', () => ({
  isInteractive: () => false,
  isLocalSession: () => false,
}));
vi.mock('../src/utils/environment.js', () => ({ checkAndDisplayEnvironment: mocks.environment }));

let directory: string;
let client: TelemetryClient;
let exporter: InMemoryLogRecordExporter;
const account = {
  username: 'private@example.com',
  tenantId: '11111111-1111-4111-8111-111111111111',
};

beforeEach(async () => {
  vi.clearAllMocks();
  directory = await mkdtemp(join(tmpdir(), 'teams-login-telemetry-'));
  const state = new TelemetryState(join(directory, 'state.json'));
  await state.setEnrollment('on');
  exporter = new InMemoryLogRecordExporter();
  client = await startTelemetry({
    state,
    version: 'test',
    enabled: true,
    env: {},
    exporter: () => exporter,
  });
  setTelemetry(client);
});

afterEach(async () => {
  await client.close();
  setTelemetry(await startTelemetry({ version: 'test', enabled: false }));
  await rm(directory, { recursive: true, force: true });
});

describe('login observations', () => {
  it('records cached login once without collecting the account name', async () => {
    mocks.getAccount.mockResolvedValue(account);
    const { loginCommand } = await import('../src/commands/auth/login.js');
    await loginCommand.parseAsync([], { from: 'user' });
    await client.flush();
    const records = exporter
      .getFinishedLogRecords()
      .filter((record) => record.body === 'teams.cli.operation');
    expect(records).toHaveLength(2);
    expect(records[1].attributes).toMatchObject({
      operation: 'auth.login',
      outcome: 'succeeded',
      authMode: 'cached',
      tenantId: account.tenantId,
    });
    expect(mocks.login).not.toHaveBeenCalled();
    expect(JSON.stringify(records)).not.toContain(account.username);
  });

  it('records a new device-code sign-in once', async () => {
    mocks.getAccount.mockResolvedValue(null);
    mocks.login.mockResolvedValue(account);
    const { loginCommand } = await import('../src/commands/auth/login.js');
    await loginCommand.parseAsync(['--device-code'], { from: 'user' });
    await client.flush();
    const records = exporter
      .getFinishedLogRecords()
      .filter((record) => record.body === 'teams.cli.operation');
    expect(records).toHaveLength(2);
    expect(records[1].attributes).toMatchObject({
      operation: 'auth.login',
      outcome: 'succeeded',
      authMode: 'device_code',
      tenantId: account.tenantId,
    });
  });
});
