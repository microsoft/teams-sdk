import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LogRecordExporter, ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { sendPostinstall } from '../src/telemetry/postinstall.js';
import { TelemetryState } from '../src/telemetry/state.js';

const directories: string[] = [];

beforeAll(async () => {
  // Payload assertions must not depend on best-effort cold-start delivery under CI load.
  await import('@opentelemetry/sdk-logs');
});

async function fixture(): Promise<{
  state: TelemetryState;
  records: ReadableLogRecord[];
  exporter: LogRecordExporter;
}> {
  const directory = await mkdtemp(join(tmpdir(), 'teams-install-telemetry-'));
  directories.push(directory);
  const records: ReadableLogRecord[] = [];
  return {
    state: new TelemetryState(join(directory, 'state.json')),
    records,
    exporter: {
      export(batch, callback): void {
        records.push(...batch);
        callback({ code: 0 });
      },
      shutdown: async () => undefined,
    },
  };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe('installation-only telemetry', () => {
  it('creates no state or exporter without explicit enrollment', async () => {
    const { state } = await fixture();
    const createExporter = vi.fn((): LogRecordExporter => {
      throw new Error('Must not initialize');
    });
    await sendPostinstall({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: createExporter,
    });
    expect(createExporter).not.toHaveBeenCalled();
    await expect(readFile(state.file)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps production collection gated off even after enrollment', async () => {
    const { state } = await fixture();
    const createExporter = vi.fn((): LogRecordExporter => {
      throw new Error('Must not initialize');
    });
    await state.setEnrollment('on');
    await sendPostinstall({
      state,
      version: 'test',
      env: { TEAMS_CLI_TELEMETRY_CONNECTION_STRING: 'configured' },
      exporter: createExporter,
    });
    expect(createExporter).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(state.file, 'utf8')).installationId).toBeUndefined();
  });

  it.each(['DO_NOT_TRACK', 'TEAMS_CLI_TELEMETRY_OPTOUT'])('honors the %s veto', async (key) => {
    const { state } = await fixture();
    const createExporter = vi.fn((): LogRecordExporter => {
      throw new Error('Must not initialize');
    });
    await state.setEnrollment('on');
    await sendPostinstall({
      state,
      version: 'test',
      enabled: true,
      env: { [key]: '1' },
      exporter: createExporter,
    });
    expect(createExporter).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(state.file, 'utf8')).installationId).toBeUndefined();
  });

  it('emits only postinstall with bounded metadata and reuses the enrolled installation ID', async () => {
    const { state, exporter, records } = await fixture();
    await state.setEnrollment('on');
    const options = {
      state,
      version: 'test',
      enabled: true,
      env: { PRIVATE_TOKEN: 'private value' },
      exporter: () => exporter,
    };
    await sendPostinstall(options);
    await sendPostinstall(options);
    expect(records).toHaveLength(2);
    expect(records.every((record) => record.body === 'teams.cli.postinstall')).toBe(true);
    expect(Object.keys(records[0].attributes).sort()).toEqual([
      'cliVersion',
      'installationId',
      'invocationId',
      'os',
      'schemaVersion',
      'timestamp',
    ]);
    expect(records[0].attributes.installationId).toBeTruthy();
    expect(records[0].attributes.installationId).toBe(records[1].attributes.installationId);
    expect(records[0].attributes.invocationId).not.toBe(records[1].attributes.invocationId);
    expect(JSON.stringify(records)).not.toContain('private value');
  });

  it('persists consent without IDs and rotates identity after opt-out and re-enrollment', async () => {
    const { state, exporter, records } = await fixture();
    await state.setEnrollment('on');
    expect(JSON.parse(await readFile(state.file, 'utf8')).installationId).toBeUndefined();
    const options = { state, version: 'test', enabled: true, env: {}, exporter: () => exporter };
    await sendPostinstall(options);
    await state.setEnrollment('off');
    expect(JSON.parse(await readFile(state.file, 'utf8')).installationId).toBeUndefined();
    await sendPostinstall(options);
    expect(records).toHaveLength(1);
    await state.setEnrollment('on');
    await sendPostinstall(options);
    expect(records).toHaveLength(2);
    expect(records[0].attributes.installationId).not.toBe(records[1].attributes.installationId);
  });

  it('rechecks consent before exporting a buffered event', async () => {
    const { state, exporter, records } = await fixture();
    await state.setEnrollment('on');
    const isCurrent = state.isCurrent.bind(state);
    state.isCurrent = async (session): Promise<boolean> => {
      await state.setEnrollment('off');
      return isCurrent(session);
    };
    await sendPostinstall({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => exporter,
    });
    expect(records).toEqual([]);
  });

  it('rechecks an environment veto before creating an installation ID', async () => {
    const { state, exporter, records } = await fixture();
    const env: NodeJS.ProcessEnv = {};
    await state.setEnrollment('on');
    await sendPostinstall({
      state,
      version: 'test',
      enabled: true,
      env,
      exporter: () => {
        env.DO_NOT_TRACK = '1';
        return exporter;
      },
    });
    expect(records).toEqual([]);
    expect(JSON.parse(await readFile(state.file, 'utf8')).installationId).toBeUndefined();
  });

  it('does not overwrite malformed state', async () => {
    const { state } = await fixture();
    await writeFile(state.file, '{"enrollment":"on"}');
    await sendPostinstall({ state, version: 'test', enabled: true, env: {} });
    expect(await readFile(state.file, 'utf8')).toBe('{"enrollment":"on"}');
    await expect(state.setEnrollment('on')).rejects.toThrow();
  });

  it('does not wait indefinitely for an abandoned state lock or a stalled exporter', async () => {
    const { state } = await fixture();
    await state.setEnrollment('on');
    await mkdir(`${state.file}.lock`);
    const started = performance.now();
    await sendPostinstall({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => ({
        export: () => undefined,
        shutdown: async () => undefined,
      }),
    });
    await rm(`${state.file}.lock`, { recursive: true, force: true });
    await sendPostinstall({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => ({
        export: () => undefined,
        shutdown: async () => undefined,
      }),
    });
    expect(performance.now() - started).toBeLessThan(1600);
  });

  it('keeps a single installation identity across concurrent enrolled hooks', async () => {
    const { state } = await fixture();
    await state.setEnrollment('on');
    const [first, second] = await Promise.all([state.begin(), state.begin()]);
    expect(first?.installationId).toBeTruthy();
    expect(first?.installationId).toBe(second?.installationId);
  });
});
