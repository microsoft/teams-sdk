import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  InMemoryLogRecordExporter,
  type LogRecordExporter,
  type ReadableLogRecord,
} from '@opentelemetry/sdk-logs';
import { startTelemetry, TelemetryOperation } from '../src/telemetry/client.js';
import { TelemetryState } from '../src/telemetry/state.js';
import { sendPostinstall } from '../src/telemetry/postinstall.js';

const directories: string[] = [];
const botId = '11111111-1111-4111-8111-111111111111';
const appId = '22222222-2222-4222-8222-222222222222';

async function fixture(): Promise<{
  directory: string;
  state: TelemetryState;
  exporter: InMemoryLogRecordExporter;
}> {
  const directory = await mkdtemp(join(tmpdir(), 'teams-telemetry-'));
  directories.push(directory);
  return {
    directory,
    state: new TelemetryState(join(directory, 'state.json')),
    exporter: new InMemoryLogRecordExporter(),
  };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe('telemetry privacy and correlation', () => {
  it('keeps the production release gate off even for prior enrollment and an exporter override', async () => {
    const { state, exporter } = await fixture();
    await state.setEnrollment('on');
    let creations = 0;
    const client = await startTelemetry({
      state,
      version: 'test',
      env: { TEAMS_CLI_TELEMETRY_CONNECTION_STRING: 'configured' },
      exporter: () => {
        creations++;
        return exporter;
      },
    });
    expect(client.enabled).toBe(false);
    expect(creations).toBe(0);
    expect(JSON.parse(await readFile(state.file, 'utf8')).installationId).toBeUndefined();
    await client.close();
  });

  it('creates no IDs, state or exporter without both release activation and enrollment', async () => {
    const { state, exporter, directory } = await fixture();
    let creations = 0;
    for (const enabled of [false, true]) {
      const client = await startTelemetry({
        state,
        version: 'test',
        enabled,
        env: {},
        exporter: () => {
          creations++;
          return exporter;
        },
      });
      await client.run('project.create', {}, async () => undefined, {
        target: join(directory, 'private-project'),
        origin: 'project.create',
      });
      await client.close();
    }
    expect(creations).toBe(0);
    await expect(readFile(state.file, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('honors opt-out vetoes even with persisted enrollment', async () => {
    const { state, exporter } = await fixture();
    await state.setEnrollment('on');
    for (const env of [{ DO_NOT_TRACK: '1' }, { TEAMS_CLI_TELEMETRY_OPTOUT: '1' }]) {
      const client = await startTelemetry({
        state,
        version: 'test',
        enabled: true,
        env,
        exporter: () => {
          throw new Error('must not initialize');
        },
      });
      await client.close();
    }
    expect(JSON.parse(await readFile(state.file, 'utf8')).installationId).toBeUndefined();
    expect(exporter.getFinishedLogRecords()).toEqual([]);
  });

  it('pairs outcomes, keeps retry origins, and never exports paths or exception text', async () => {
    const { state, exporter, directory } = await fixture();
    await state.setEnrollment('on');
    const client = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => exporter,
    });
    const target = join(directory, 'private-project');
    await expect(
      client.run(
        'project.create',
        { language: 'typescript', template: 'echo' },
        async () => {
          throw new Error('private token and path');
        },
        { target, origin: 'project.create' }
      )
    ).rejects.toThrow('private token');
    await client.run(
      'project.create',
      { language: 'typescript', template: 'echo' },
      async () => undefined,
      { target, origin: 'project.create' }
    );
    await client.run(
      'app.register',
      {},
      async (operation) => {
        operation.link({ botId, teamsAppId: appId, tenantId: 'private-invalid-id' });
      },
      { target, origin: 'registration' }
    );
    await client.flush();
    const records = exporter.getFinishedLogRecords();
    const operations = records.filter((record) => record.body === 'teams.cli.operation');
    expect(operations).toHaveLength(6);
    expect(operations[0].attributes.attemptId).toBe(operations[2].attributes.attemptId);
    expect(operations[0].attributes.attemptStartedAt).toBe(
      operations[4].attributes.attemptStartedAt
    );
    expect(operations[0].attributes.operationId).not.toBe(operations[2].attributes.operationId);
    expect(operations[1].attributes).toMatchObject({
      outcome: 'failed',
      failureCategory: 'unknown',
    });
    expect(
      records.find((record) => record.body === 'teams.cli.identity_link')?.attributes
    ).toMatchObject({ botId, teamsAppId: appId });
    const payload = JSON.stringify(
      records.map((record) => ({ body: record.body, attributes: record.attributes }))
    );
    for (const secret of [directory, 'private-project', 'private token', 'private-invalid-id']) {
      expect(payload).not.toContain(secret);
    }
    await client.close();
  });

  it('resumes across invocations, separates projects, and leaves standalone actions unattributed', async () => {
    const { state, exporter, directory } = await fixture();
    await state.setEnrollment('on');
    const options = { state, version: 'test', enabled: true, env: {}, exporter: () => exporter };
    const first = await startTelemetry(options);
    const target = join(directory, 'one');
    await first.run('project.create', {}, async () => undefined, {
      target,
      origin: 'project.create',
    });
    await first.flush();
    const original = exporter
      .getFinishedLogRecords()
      .find((record) => record.body === 'teams.cli.operation')!;
    await first.close();
    const nextExporter = new InMemoryLogRecordExporter();
    const second = await startTelemetry({ ...options, exporter: () => nextExporter });
    await second.run('app.register', {}, async () => undefined, { target, origin: 'registration' });
    await second.run('project.create', {}, async () => undefined, {
      target: join(directory, 'two'),
      origin: 'project.create',
    });
    await second.run('auth.login', {}, async () => undefined);
    await second.flush();
    const records = nextExporter
      .getFinishedLogRecords()
      .filter((record) => record.body === 'teams.cli.operation');
    expect(records[0].attributes.attemptId).toBe(original.attributes.attemptId);
    expect(records[0].attributes.installationId).toBe(original.attributes.installationId);
    expect(records[0].attributes.invocationId).not.toBe(original.attributes.invocationId);
    expect(records[2].attributes.attemptId).not.toBe(original.attributes.attemptId);
    expect(records[4].attributes.attemptId).toBeUndefined();
    await second.close();
  });

  it('records cancellation and discards buffered data on durable opt-out', async () => {
    const { state, exporter } = await fixture();
    await state.setEnrollment('on');
    const sent: ReadableLogRecord[] = [];
    const client = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => ({
        export(records, callback): void {
          sent.push(...records);
          exporter.export(records, callback);
        },
        shutdown: async () => undefined,
      }),
    });
    await client.run('app.register', {}, async (operation) => operation.cancel());
    await client.flush();
    expect(
      exporter.getFinishedLogRecords().some((record) => record.attributes.outcome === 'cancelled')
    ).toBe(true);
    exporter.reset();
    sent.length = 0;
    await client.run('auth.login', {}, async () => undefined);
    await state.setEnrollment('off');
    await client.close();
    expect(exporter.getFinishedLogRecords()).toEqual([]);
    expect(sent).toEqual([]);
  });

  it('discards buffered records immediately on revocation and generates no further operation IDs', async () => {
    const { state } = await fixture();
    await state.setEnrollment('on');
    const sent: ReadableLogRecord[] = [];
    const client = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => ({
        export(records, callback): void {
          sent.push(...records);
          callback({ code: 0 });
        },
        shutdown: async () => undefined,
      }),
    });
    await client.run('auth.login', {}, async () => undefined);
    client.abort();
    await client.run('auth.login', {}, async (operation) => {
      expect(operation.id).toBe('');
    });
    await new Promise<void>((done) => setTimeout(done, 20));
    expect(sent).toEqual([]);
    await client.close();
  });

  it('fails closed on malformed state and never overwrites it', async () => {
    const { state, exporter } = await fixture();
    await writeFile(state.file, '{"enrollment":"on","installationId":"not-a-guid"}');
    const client = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => exporter,
    });
    await client.run('auth.login', {}, async () => 'result');
    await client.close();
    expect(await readFile(state.file, 'utf8')).toBe(
      '{"enrollment":"on","installationId":"not-a-guid"}'
    );
    expect(exporter.getFinishedLogRecords()).toEqual([]);
  });

  it('rejects private text hidden in a parseable state timestamp', async () => {
    const { state, exporter, directory } = await fixture();
    await state.setEnrollment('on');
    await state.attempt(join(directory, 'project'), 'project.create');
    const stored: { attempts: { startedAt: string }[] } = JSON.parse(
      await readFile(state.file, 'utf8')
    );
    stored.attempts[0].startedAt = '2026-11-19 (private content)';
    await writeFile(state.file, JSON.stringify(stored));
    const client = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => exporter,
    });
    expect(client.enabled).toBe(false);
    await client.close();
  });

  it('does not lose concurrent project attempts', async () => {
    const { state, directory } = await fixture();
    await state.setEnrollment('on');
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        state.attempt(join(directory, String(i)), 'project.create')
      )
    );
    const stored = JSON.parse(await readFile(state.file, 'utf8'));
    expect(stored.attempts).toHaveLength(5);
  });

  it('does not attribute an unrelated directory to the most recent attempt', async () => {
    const { state, directory } = await fixture();
    const project = join(directory, 'project');
    await mkdir(project);
    await writeFile(join(project, 'package.json'), '{}');
    await state.setEnrollment('on');
    const attempt = await state.attempt(project, 'project.create');
    expect((await state.resolveAttempt(join(project, 'src')))?.id).toBe(attempt?.id);
    expect(await state.resolveAttempt(directory)).toBeUndefined();
  });

  it('binds a prompted credential destination before registration without borrowing cwd', async () => {
    const { state, exporter, directory } = await fixture();
    await state.setEnrollment('on');
    const client = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => exporter,
    });
    await client.run(
      'app.register',
      {},
      async (operation) => {
        await operation.bindTarget({
          target: join(directory, 'chosen-project'),
          origin: 'registration',
          explicit: true,
        });
        operation.link({ botId, teamsAppId: appId });
        await client.run('auth.login', { authMode: 'cached' }, async () => undefined);
      },
      { target: directory, origin: 'registration', defer: true }
    );
    await client.flush();
    const records = exporter
      .getFinishedLogRecords()
      .filter((record) => record.body === 'teams.cli.operation');
    expect(records[0].attributes.attemptId).toBeTruthy();
    expect(records[0].attributes.attemptId).toBe(records[3].attributes.attemptId);
    expect(records[1].attributes.attemptId).toBeTruthy();
    expect(records[1].attributes.attemptId).toBe(records[3].attributes.attemptId);
    expect(records[3].attributes.attemptOrigin).toBe('registration');
    await client.close();
  });

  it('does not change command results when persistence or export fails', async () => {
    const { state } = await fixture();
    await state.setEnrollment('on');
    const client = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => {
        throw new Error('sender unavailable');
      },
    });
    await expect(client.run('auth.login', {}, async () => 42)).resolves.toBe(42);
    await expect(client.close()).resolves.toBeUndefined();
  });

  it('does not initialize on a connection-string override or a veto set to zero alone', async () => {
    const { state } = await fixture();
    const client = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: { DO_NOT_TRACK: '0', TEAMS_CLI_TELEMETRY_CONNECTION_STRING: 'configured' },
      exporter: () => {
        throw new Error('must not initialize');
      },
    });
    expect(client.enabled).toBe(false);
    await expect(readFile(state.file)).rejects.toMatchObject({ code: 'ENOENT' });
    await client.close();
  });

  it('does not erase malformed state or wait indefinitely for an abandoned lock', async () => {
    const { state } = await fixture();
    await state.setEnrollment('on');
    await mkdir(`${state.file}.lock`);
    const start = performance.now();
    await expect(state.attempt('private-project', 'project.create')).rejects.toThrow('locked');
    expect(performance.now() - start).toBeLessThan(1500);
    expect(JSON.parse(await readFile(state.file, 'utf8')).attempts).toBeUndefined();
  });

  it('upgrades MVP enrollment without rotating identity or letting postinstall consume or reset CLI state', async () => {
    const { state, directory } = await fixture();
    await writeFile(
      state.file,
      JSON.stringify({ version: 1, enrollment: 'on', generation: 7, installationId: botId })
    );
    const hookRecords: ReadableLogRecord[] = [];
    const hookOptions = {
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: (): LogRecordExporter => ({
        export(records, callback): void {
          hookRecords.push(...records);
          callback({ code: 0 });
        },
        shutdown: async (): Promise<void> => undefined,
      }),
    };
    await sendPostinstall(hookOptions);
    expect(hookRecords.map((record) => record.body)).toEqual(['teams.cli.postinstall']);
    expect(hookRecords[0].attributes.installationId).toBe(botId);
    const next = new InMemoryLogRecordExporter();
    const cli = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => next,
    });
    await cli.flush();
    expect(next.getFinishedLogRecords().map((record) => record.body)).toEqual([
      'teams.cli.first_use',
    ]);
    expect(next.getFinishedLogRecords()[0].attributes.installationId).toBe(botId);
    await cli.run('project.create', {}, async () => undefined, {
      target: join(directory, 'project'),
      origin: 'project.create',
    });
    await cli.close();
    const before = JSON.parse(await readFile(state.file, 'utf8'));
    expect(before.firstUse).toBe(true);
    expect(before.attempts).toHaveLength(1);
    await sendPostinstall(hookOptions);
    expect(hookRecords).toHaveLength(2);
    expect(JSON.parse(await readFile(state.file, 'utf8'))).toEqual(before);
    const later = new InMemoryLogRecordExporter();
    const repeated = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => later,
    });
    await repeated.flush();
    expect(later.getFinishedLogRecords()).toEqual([]);
    await repeated.close();
  });

  it('waits for deferred start and completion when cancellation is requested concurrently', async () => {
    let releaseStart: () => void = () => undefined;
    const started = new Promise<void>((done) => {
      releaseStart = done;
    });
    const phases: string[] = [];
    const operation = new TelemetryOperation(
      'project.create',
      async (_event, attributes) => {
        if (attributes.phase === 'started') await started;
        if (attributes.phase) phases.push(attributes.phase);
      },
      {},
      true,
      async () => undefined
    );
    const first = operation.cancel();
    let cancelled = false;
    const second = operation.cancel().then(() => {
      cancelled = true;
    });
    await new Promise<void>((done) => setImmediate(done));
    const finishedEarly = cancelled;
    releaseStart();
    await Promise.all([first, second]);
    expect(finishedEarly).toBe(false);
    expect(phases).toEqual(['started', 'completed']);
  });

  it('closes first use exactly once even when shutdown is requested concurrently', async () => {
    const { state } = await fixture();
    await state.setEnrollment('on');
    const sent: ReadableLogRecord[] = [];
    const client = await startTelemetry({
      state,
      version: 'test',
      enabled: true,
      env: {},
      exporter: () => ({
        export(records, callback): void {
          sent.push(...records);
          callback({ code: 0 });
        },
        shutdown: async () => undefined,
      }),
    });
    await Promise.all([client.close('cancelled'), client.close('cancelled')]);
    expect(
      sent.filter(
        (record) => record.body === 'teams.cli.first_use' && record.attributes.phase === 'completed'
      )
    ).toHaveLength(1);
    expect(sent.find((record) => record.attributes.phase === 'completed')?.attributes.outcome).toBe(
      'cancelled'
    );
  });
});
