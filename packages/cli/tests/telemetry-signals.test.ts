import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

const cliRoot = resolve(import.meta.dirname, '..');
const directories: string[] = [];

interface SignalRecord {
  body: string;
  attributes: { phase?: string; outcome?: string; operation?: string };
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('telemetry signal finalization', () => {
  it.each([
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ] as const)(
    'aborts requests and blocks later HTTP/Azure mutations while flushing %s',
    (signal, code) => {
      const directory = mkdtempSync(join(tmpdir(), 'teams-telemetry-cancel-'));
      directories.push(directory);
      const script = `
      import { createServer } from 'node:http';
      import childProcess from 'node:child_process';
      import { syncBuiltinESMExports } from 'node:module';
      import { promisify } from 'node:util';
      import { startTelemetry } from './src/telemetry/client.ts';
      import { TelemetryState } from './src/telemetry/state.ts';
      import { installTelemetrySignalHandlers } from './src/telemetry/signals.ts';
      import { apiFetch } from './src/utils/http.ts';
      let azureCalls = 0;
      let azureAborted = false;
      const fakeExecFile = () => { throw new Error('Unexpected non-promisified invocation'); };
      fakeExecFile[promisify.custom] = async (_command, args, options) => {
        azureCalls++;
        if (args.includes('show')) {
          return new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () => {
              azureAborted = true;
              reject(options.signal.reason);
            }, { once: true });
          });
        }
        return { stdout: '{}', stderr: '' };
      };
      childProcess.execFile = fakeExecFile;
      syncBuiltinESMExports();
      const { runAz } = await import('./src/utils/az.ts');
      let mutations = 0;
      let aborted = false;
      let blocked = false;
      let attempted;
      const finished = new Promise(done => { attempted = done; });
      const server = createServer((request, response) => {
        if (request.url === '/identity') {
          process.emit('${signal}', '${signal}');
          setImmediate(() => response.end('{}'));
        } else {
          mutations++;
          response.end('{}');
        }
      });
      await new Promise(done => server.listen(0, '127.0.0.1', done));
      const endpoint = 'http://127.0.0.1:' + server.address().port;
      const state = new TelemetryState(${JSON.stringify(join(directory, 'state.json'))});
      await state.setEnrollment('on');
      const client = await startTelemetry({
        state, version: 'test', enabled: true, env: {},
        exporter: () => ({
          export(records, callback) {
            void finished.then(() => {
              process.stdout.write(JSON.stringify({
                mutations, azureCalls, azureAborted, aborted, blocked,
                records: records.map(({ body, attributes }) => ({ body, attributes }))
              }));
              callback({ code: 0 });
            });
          },
          shutdown: async () => {}
        })
      });
      installTelemetrySignalHandlers(client, () => {});
      await client.run('app.register', {}, async () => {
        void runAz(['account', 'show']).catch(() => {});
        try {
          await apiFetch(endpoint + '/identity', { signal: new AbortController().signal });
        } catch (error) {
          aborted = error.name === 'AbortError';
        }
        try {
          await apiFetch(endpoint + '/next-resource', { method: 'POST' });
        } catch (error) {
          blocked = error.name === 'AbortError';
        }
        try { await runAz(['resource', 'create']); } catch {}
        attempted();
        await new Promise(() => {});
      });
    `;
      const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', '--input-type=module', '-e', script],
        { cwd: cliRoot, encoding: 'utf8', timeout: 8000, windowsHide: true }
      );
      expect(result.error).toBeUndefined();
      expect(result.stderr).toBe('');
      expect(result.status).toBe(code);
      const output: {
        mutations: number;
        azureCalls: number;
        azureAborted: boolean;
        aborted: boolean;
        blocked: boolean;
        records: SignalRecord[];
      } = JSON.parse(result.stdout || '{}');
      expect(output.mutations).toBe(0);
      expect(output.azureCalls).toBe(1);
      expect(output.azureAborted).toBe(true);
      expect(output.aborted).toBe(true);
      expect(output.blocked).toBe(true);
      expect(output.records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            body: 'teams.cli.operation',
            attributes: expect.objectContaining({
              operation: 'app.register',
              phase: 'completed',
              outcome: 'cancelled',
            }),
          }),
        ])
      );
    }
  );

  it.each([
    ['SIGINT', 130, false, false],
    ['SIGTERM', 143, false, false],
    ['SIGINT', 130, true, false],
    ['SIGINT', 130, false, true],
    ['SIGTERM', 143, false, true],
  ] as const)(
    'flushes cancellation before %s exits with code %s (other listener: %s, prompt: %s)',
    (signal, code, otherListener, withPrompt) => {
      const directory = mkdtempSync(join(tmpdir(), 'teams-telemetry-signal-'));
      directories.push(directory);
      const script = `
      import { startTelemetry } from './src/telemetry/client.ts';
      import { TelemetryState } from './src/telemetry/state.ts';
      import { installTelemetrySignalHandlers } from './src/telemetry/signals.ts';
      import { createSilentSpinner } from './src/utils/spinner.ts';
      import { input } from '@inquirer/prompts';
      import { PassThrough, Writable } from 'node:stream';
      const state = new TelemetryState(${JSON.stringify(join(directory, 'state.json'))});
      await state.setEnrollment('on');
      const client = await startTelemetry({
        state, version: 'test', enabled: true, env: {},
        exporter: () => ({
          export(records, callback) {
            setTimeout(() => {
              process.stdout.write(JSON.stringify(records.map(({ body, attributes }) => ({ body, attributes }))));
              callback({ code: 0 });
            }, 30);
          },
          shutdown: async () => {}
        })
      });
      if (${otherListener}) process.on('${signal}', () => {});
      installTelemetrySignalHandlers(client, () => {});
      await client.run('auth.login', {}, async () => {
        if (${withPrompt}) {
          void input({ message: 'Continue?' }, {
            input: new PassThrough(),
            output: new Writable({ write(_chunk, _encoding, done) { done(); } })
          }).catch(() => {});
        }
        createSilentSpinner('Working...', true).start();
        createSilentSpinner('Also working...', true).start();
        setImmediate(() => process.emit('${signal}', '${signal}'));
        await new Promise(() => {});
      });
    `;
      const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', '--input-type=module', '-e', script],
        {
          cwd: cliRoot,
          encoding: 'utf8',
          timeout: 8000,
          windowsHide: true,
        }
      );
      expect(result.error).toBeUndefined();
      expect(result.stderr).toBe('');
      expect(result.status).toBe(code);
      const records: SignalRecord[] = JSON.parse(result.stdout || '[]');
      expect(records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            body: 'teams.cli.operation',
            attributes: expect.objectContaining({
              operation: 'auth.login',
              phase: 'completed',
              outcome: 'cancelled',
            }),
          }),
          expect.objectContaining({
            body: 'teams.cli.first_use',
            attributes: expect.objectContaining({
              phase: 'completed',
              outcome: 'cancelled',
            }),
          }),
        ])
      );
    }
  );
});
