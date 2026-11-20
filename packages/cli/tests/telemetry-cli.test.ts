import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

const cliRoot = resolve(import.meta.dirname, '..');
const cli = join(cliRoot, 'dist', 'index.js');
const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function profile(): { directory: string; env: NodeJS.ProcessEnv; stateFile: string } {
  const directory = mkdtempSync(join(tmpdir(), 'teams-telemetry-cli-'));
  directories.push(directory);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: directory,
    USERPROFILE: directory,
    APPDATA: directory,
    LOCALAPPDATA: directory,
    XDG_CONFIG_HOME: directory,
    XDG_CACHE_HOME: directory,
    XDG_DATA_HOME: directory,
    TEAMS_NO_INTERACTIVE: '1',
    TEAMS_CLI_TELEMETRY_OPTOUT: '0',
    DO_NOT_TRACK: '0',
    TEAMS_CLI_TELEMETRY_CONNECTION_STRING:
      'InstrumentationKey=11111111-1111-4111-8111-111111111111;IngestionEndpoint=https://127.0.0.1:1/',
  };
  const paths: { data: string } = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { paths } from './dist/utils/paths.js'; process.stdout.write(JSON.stringify(paths));",
      ],
      { cwd: cliRoot, env, encoding: 'utf8' }
    )
  );
  return { directory, env, stateFile: join(paths.data, 'telemetry-v1.json') };
}

describe('packaged CLI telemetry controls', () => {
  it.each([
    ['unwrapped', false],
    ['wrapped', false],
    ['unhandled', false],
    ['unwrapped', true],
    ['wrapped', true],
    ['unhandled', true],
  ] as const)(
    'stops active TTY spinners before flushing (%s, cancelled: %s)',
    (mode, cancelled) => {
      const { directory, env, stateFile } = profile();
      const signal = mode === 'wrapped' ? 'SIGTERM' : 'SIGINT';
      const flushedFile = join(directory, 'flushed.json');
      const script = `
      import tty from 'node:tty';
      tty.isatty = () => true;
      delete process.env.CI;
      process.env.TERM = 'xterm';
      const { createSilentSpinner, stopSpinners } = await import('./dist/utils/spinner.js');
      const { logoutCommand } = await import('./dist/commands/auth/logout.js');
      const { wrapAction } = await import('./dist/utils/errors.js');
      const action = async () => {
        let client;
        if (${mode !== 'unwrapped' || cancelled}) {
          const { writeFileSync } = await import('node:fs');
          const { startTelemetry, setTelemetry } = await import('./dist/telemetry/client.js');
          const { TelemetryState } = await import('./dist/telemetry/state.js');
          const state = new TelemetryState(${JSON.stringify(join(directory, 'wrapped-state.json'))});
          await state.setEnrollment('on');
          client = await startTelemetry({
            state, version: 'test', enabled: true, env: {},
            exporter: () => ({
              export(records, callback) {
                setTimeout(() => {
                  writeFileSync(${JSON.stringify(flushedFile)}, JSON.stringify(
                    records.map(({ body, attributes }) => ({ body, attributes }))
                  ));
                  callback({ code: 0 });
                }, 120);
              },
              shutdown: async () => {}
            })
          });
          setTelemetry(client);
        }
        if (${cancelled}) {
          const { installTelemetrySignalHandlers } = await import('./dist/telemetry/signals.js');
          installTelemetrySignalHandlers(client, () => {});
        }
        createSilentSpinner('Logging out...').start();
        if (${cancelled}) {
          const { getCancellationSignal } = await import('./dist/utils/cancellation.js');
          const pending = client.run('auth.login', {}, async () => {
            const signal = getCancellationSignal();
            const request = new Promise((_resolve, reject) => {
              signal.addEventListener('abort', () => reject(signal.reason), { once: true });
            });
            setImmediate(() => process.emit('${signal}', '${signal}'));
            return request;
          });
          if (${mode === 'unhandled'}) {
            void pending;
            await new Promise(() => {});
          }
          await pending;
          return;
        }
        if (${mode === 'unhandled'}) {
          void Promise.reject(new Error('Simulated logout failure'));
          await new Promise(() => {});
        }
        throw new Error('Simulated logout failure');
      };
      logoutCommand.action(${mode === 'wrapped'} ? wrapAction(action) : action);
      process.execArgv = [];
      process.argv = [process.execPath, ${JSON.stringify(cli)}, 'logout', '--disable-auto-update'];
      await import('./dist/index.js');
      setTimeout(() => {
        process.stdout.write('Spinner kept the failed CLI alive');
        stopSpinners();
      }, 1000).unref();
    `;
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: cliRoot,
        env,
        encoding: 'utf8',
        timeout: 15000,
        windowsHide: true,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(cancelled ? (signal === 'SIGTERM' ? 143 : 130) : 1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('\x1b[?25h');
      if (cancelled) {
        expect(result.stderr).not.toContain('This operation was aborted');
        expect(existsSync(flushedFile)).toBe(true);
        const records: { attributes: { outcome?: string } }[] = JSON.parse(
          readFileSync(flushedFile, 'utf8')
        );
        expect(records.some((record) => record.attributes.outcome === 'cancelled')).toBe(true);
      } else {
        expect(result.stderr).toContain('Simulated logout failure');
        expect(result.stderr.indexOf('\x1b[?25h')).toBeLessThan(
          result.stderr.indexOf('Simulated logout failure')
        );
        expect(result.stderr.lastIndexOf('Logging out...')).toBeLessThan(
          result.stderr.indexOf('Simulated logout failure')
        );
      }
      expect(existsSync(stateFile)).toBe(false);
    }
  );

  it('preserves help/version/JSON/errors without creating telemetry state', () => {
    const { directory, env, stateFile } = profile();
    for (const args of [['--help'], ['--version'], ['app', 'create', '--help', '--json']]) {
      const result = spawnSync(process.execPath, [cli, ...args], {
        cwd: directory,
        env,
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      if (args.includes('--json')) expect(JSON.parse(result.stdout).name).toBe('create');
    }
    const invalid = spawnSync(process.execPath, [cli, 'nonexistent-command'], {
      cwd: directory,
      env,
      encoding: 'utf8',
    });
    expect(invalid.status).toBe(1);
    expect(existsSync(stateFile)).toBe(false);
  });

  it('persists explicit enrollment separately but the release gate still prevents collection', () => {
    const { directory, env, stateFile } = profile();
    const run = (args: string[]): string =>
      execFileSync(process.execPath, [cli, ...args], {
        cwd: directory,
        env,
        encoding: 'utf8',
      });
    expect(JSON.parse(run(['config', 'set', 'telemetry', 'on', '--json']))).toEqual({
      key: 'telemetry',
      value: 'on',
    });
    const result = JSON.parse(
      run(['project', 'new', 'typescript', 'sample', '--json', '--yes', '--disable-auto-update'])
    );
    expect(result.language).toBe('typescript');
    const state = JSON.parse(readFileSync(stateFile, 'utf8'));
    expect(state.enrollment).toBe('on');
    expect(state.installationId).toBeUndefined();
    expect(state.attempts).toBeUndefined();
    expect(JSON.parse(run(['config', 'get', 'telemetry', '--json']))).toEqual({
      values: { telemetry: 'on' },
    });
    expect(JSON.parse(run(['config', 'set', 'telemetry', 'off', '--json']))).toEqual({
      key: 'telemetry',
      value: 'off',
    });
    expect(JSON.parse(readFileSync(stateFile, 'utf8')).enrollment).toBe('off');
  });

  it('keeps postinstall silent and successful both packaged and without compiled files', () => {
    const { directory, env, stateFile } = profile();
    const bootstrap = join(cliRoot, 'scripts', 'postinstall.cjs');
    const packaged = spawnSync(process.execPath, [bootstrap], {
      cwd: directory,
      env,
      encoding: 'utf8',
    });
    expect(packaged.status).toBe(0);
    expect(packaged.stdout + packaged.stderr).toBe('');
    expect(existsSync(stateFile)).toBe(false);
    mkdirSync(join(directory, 'scripts'));
    const isolated = join(directory, 'scripts', 'postinstall.cjs');
    copyFileSync(bootstrap, isolated);
    const missing = spawnSync(process.execPath, [isolated], {
      cwd: directory,
      env,
      encoding: 'utf8',
    });
    expect(missing.status).toBe(0);
    expect(missing.stdout + missing.stderr).toBe('');
  });
});
