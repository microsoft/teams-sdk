import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { Command } from 'commander';
import { logger } from '../src/utils/logger.js';
import { CliError, wrapAction } from '../src/utils/errors.js';
import { parseConnectionString } from '../src/telemetry/exporter.js';

interface SmokeOptions {
  live?: boolean;
}
interface PackageManifest {
  name: string;
  version: string;
  files: string[];
}
interface PackResult {
  filename: string;
}
interface CapturedTrace {
  data: {
    baseData: { message: string; properties: { installationId: string; cliVersion: string } };
  };
}
interface StoredIdentity {
  installationId?: string;
}

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');

async function smoke(options: SmokeOptions): Promise<void> {
  const npm = process.env.npm_execpath;
  if (!npm)
    throw new CliError('UNKNOWN', 'Run this smoke test through npm run test:telemetry:install.');
  const connectionString = process.env.TEAMS_CLI_TELEMETRY_CONNECTION_STRING ?? '';
  if (
    options.live &&
    (!parseConnectionString(connectionString) ||
      process.env.DO_NOT_TRACK === '1' ||
      process.env.TEAMS_CLI_TELEMETRY_OPTOUT === '1')
  ) {
    throw new CliError(
      'VALIDATION_FORMAT',
      'Live testing requires an approved test connection string and no telemetry environment veto.'
    );
  }
  const directory = await mkdtemp(join(tmpdir(), 'teams-telemetry-install-'));
  const stage = join(directory, 'package');
  const consumer = join(directory, 'consumer');
  const profile = join(directory, 'profile');
  const requests: string[] = [];
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      requests.push(body);
      response.writeHead(200).end();
    });
  });
  const npmRun = async (args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<string> =>
    (
      await run(process.execPath, [npm, ...args, '--prefix', cwd, '--workspaces=false'], {
        cwd,
        env,
        timeout: 90_000,
        maxBuffer: 1024 * 1024,
      })
    ).stdout;
  try {
    await mkdir(consumer);
    await mkdir(profile);
    const manifest: PackageManifest = JSON.parse(
      await readFile(join(root, 'package.json'), 'utf8')
    );
    for (const entry of ['package.json', 'README.md', ...manifest.files]) {
      await cp(join(root, entry), join(stage, entry), { recursive: true });
    }
    // Only the disposable, private package is test-enabled; source and normal dist stay gated off.
    await writeFile(join(stage, 'package.json'), JSON.stringify({ ...manifest, private: true }));
    const configFile = join(stage, 'dist', 'telemetry', 'config.js');
    const config = await readFile(configFile, 'utf8');
    assert.ok(
      config.includes('TELEMETRY_RELEASE_ENABLED = false'),
      'Build the normal gated package first'
    );
    await writeFile(
      configFile,
      config.replace('TELEMETRY_RELEASE_ENABLED = false', 'TELEMETRY_RELEASE_ENABLED = true')
    );
    if (!options.live) {
      await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing fixture address');
      const exporter = join(stage, 'dist', 'telemetry', 'exporter.js');
      await rename(exporter, join(stage, 'dist', 'telemetry', 'exporter-original.js'));
      // Substitute destination resolution only; the actual sender/serialization still handles the request.
      await writeFile(
        exporter,
        `
        export { AppInsightsLogExporter } from './exporter-original.js';
        export function parseConnectionString() {
          return {
            endpoint: new URL('http://127.0.0.1:${address.port}/v2.1/track'),
            instrumentationKey: '11111111-1111-4111-8111-111111111111'
          };
        }
      `
      );
    }
    const cache = (await npmRun(['config', 'get', 'cache'], root, process.env)).trim();
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      HOME: profile,
      USERPROFILE: profile,
      APPDATA: profile,
      LOCALAPPDATA: profile,
      XDG_CONFIG_HOME: profile,
      XDG_DATA_HOME: profile,
      XDG_CACHE_HOME: profile,
      npm_config_cache: cache,
      TEAMS_NO_INTERACTIVE: '1',
      DO_NOT_TRACK: '0',
      TEAMS_CLI_TELEMETRY_OPTOUT: '0',
      TEAMS_CLI_TELEMETRY_CONNECTION_STRING: options.live ? connectionString : '',
    };
    const packs: PackResult[] = JSON.parse(
      await npmRun(['pack', '--json', '--pack-destination', directory], stage, env)
    );
    await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true }));
    await npmRun(
      [
        'install',
        join(directory, packs[0].filename),
        '--offline',
        '--foreground-scripts',
        '--ignore-scripts=false',
        '--no-audit',
        '--no-fund',
      ],
      consumer,
      env
    );
    assert.equal(requests.length, 0);
    logger.info('Initial install: no telemetry');
    const installed = join(consumer, 'node_modules', ...manifest.name.split('/'));
    const configSet = async (value: string): Promise<void> => {
      await run(
        process.execPath,
        [
          join(installed, 'dist', 'index.js'),
          'config',
          'set',
          'telemetry',
          value,
          '--json',
          '--disable-auto-update',
        ],
        { cwd: consumer, env, timeout: 15_000 }
      );
    };
    const rebuild = async (environment: NodeJS.ProcessEnv = env): Promise<void> => {
      await npmRun(
        ['rebuild', manifest.name, '--foreground-scripts', '--ignore-scripts=false'],
        consumer,
        environment
      );
    };
    await configSet('on');
    await rebuild();
    if (options.live) {
      const pathsModule = pathToFileURL(join(installed, 'dist', 'utils', 'paths.js')).href;
      const result = await run(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import { paths } from ${JSON.stringify(pathsModule)}; process.stdout.write(JSON.stringify(paths.data));`,
        ],
        { cwd: consumer, env }
      );
      const data: string = JSON.parse(result.stdout);
      assert.ok(resolve(data).startsWith(profile + sep));
      const identity: StoredIdentity = JSON.parse(
        await readFile(join(data, 'telemetry-v1.json'), 'utf8')
      );
      assert.ok(identity.installationId, 'The enrolled hook did not initialize');
      logger.info(
        `Live hook completed (best effort). Verify traces for teams.cli.postinstall with installationId ${identity.installationId}.`
      );
    } else {
      assert.equal(requests.length, 1, 'Expected one opted-in postinstall request');
      const records: CapturedTrace[] = JSON.parse(requests[0]);
      assert.equal(records.length, 1);
      assert.equal(records[0].data.baseData.message, 'teams.cli.postinstall');
      assert.equal(records[0].data.baseData.properties.cliVersion, manifest.version);
      logger.info('Opted-in rebuild: one postinstall event');
    }
    await rebuild({ ...env, DO_NOT_TRACK: '1' });
    if (!options.live) assert.equal(requests.length, 1);
    logger.info('Environment veto: hook skipped');
    await configSet('off');
    await rebuild();
    if (!options.live) assert.equal(requests.length, 1);
    logger.info('Opted-out rebuild: no additional telemetry');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
    await rm(directory, { recursive: true, force: true });
  }
}

await new Command()
  .description('Test a private, disposable npm package; never enables production telemetry')
  .option(
    '--live',
    '[OPTIONAL] Send to the approved Application Insights test connection string in the environment'
  )
  .action(wrapAction(smoke))
  .parseAsync();
