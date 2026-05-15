import { afterEach, describe, expect, it, vi } from 'vitest';
import { dirname, join } from 'node:path';

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const originalExecPath = process.execPath;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('node:url');
  vi.doUnmock('node:fs');
  vi.doUnmock('node:child_process');
  Object.defineProperty(process, 'execPath', {
    value: originalExecPath,
    configurable: true,
  });
});

interface MockSelfUpdateOptions {
  filename: string;
  execPath?: string;
  commandOutputs?: Record<string, string | undefined>;
  writable?: boolean;
}

async function importSelfUpdateWithMocks(options: MockSelfUpdateOptions) {
  const packageDir = findPackageDir(options.filename);
  const packageJsonPath = join(packageDir, 'package.json');
  const existingPaths = new Set<string>([packageDir, dirname(packageDir), packageJsonPath]);
  for (const output of Object.values(options.commandOutputs ?? {})) {
    if (output) {
      existingPaths.add(output);
      existingPaths.add(dirname(output));
    }
  }

  Object.defineProperty(process, 'execPath', {
    value: options.execPath ?? originalExecPath,
    configurable: true,
  });

  vi.doMock('node:url', async (importOriginal) => ({
    ...(await importOriginal<typeof import('node:url')>()),
    fileURLToPath: vi.fn(() => options.filename),
  }));

  vi.doMock('node:fs', () => ({
    existsSync: vi.fn((path: string) => existingPaths.has(path)),
    realpathSync: vi.fn((path: string) => path),
    accessSync: vi.fn(() => {
      if (options.writable === false) throw new Error('not writable');
    }),
    constants: { W_OK: 2 },
  }));

  vi.doMock('node:child_process', () => ({
    spawn: vi.fn(),
    spawnSync: vi.fn((command: string, args: string[]) => {
      const output = options.commandOutputs?.[[command, ...args].join(' ')];
      return output === undefined
        ? { status: 1, stdout: '', stderr: 'not found' }
        : { status: 0, stdout: output, stderr: '' };
    }),
  }));

  return import('../src/utils/self-update.js');
}

function findPackageDir(filename: string): string {
  let dir = dirname(filename);
  while (dir !== dirname(dir)) {
    if (dir.endsWith('@microsoft/teams.cli')) return dir;
    dir = dirname(dir);
  }
  return dirname(filename);
}

describe('self-update safety checks', () => {
  it('does not build a self-update command for a local source checkout', async () => {
    const { getSelfUpdateCommand } = await import('../src/utils/self-update.js');

    expect(getSelfUpdateCommand()).toBeUndefined();
  });

  it('refuses a local source checkout before doing version preflight', async () => {
    const { runSelfUpdate } = await import('../src/commands/self-update.js');

    await expect(runSelfUpdate()).resolves.toBe(false);
  });

  it('builds an npm self-update command for writable global npm installs', async () => {
    const { getSelfUpdateCommand } = await importSelfUpdateWithMocks({
      filename: '/opt/node/lib/node_modules/@microsoft/teams.cli/dist/utils/self-update.js',
      execPath: '/opt/node/bin/node',
      commandOutputs: {
        'npm root -g': '/opt/node/lib/node_modules',
      },
    });

    expect(getSelfUpdateCommand()).toEqual({
      command: 'npm',
      args: ['--prefix', '/opt/node', 'install', '-g', '@microsoft/teams.cli@preview'],
      display: 'npm --prefix /opt/node install -g @microsoft/teams.cli@preview',
    });
  });

  it('builds a pnpm self-update command for writable global pnpm installs', async () => {
    const { getSelfUpdateCommand } = await importSelfUpdateWithMocks({
      filename:
        '/Users/test/Library/pnpm/global/5/.pnpm/@microsoft+teams.cli@2.11.0/node_modules/@microsoft/teams.cli/dist/utils/self-update.js',
      commandOutputs: {
        'pnpm root -g': '/Users/test/Library/pnpm/global/5/node_modules',
      },
    });

    expect(getSelfUpdateCommand()).toEqual({
      command: 'pnpm',
      args: ['install', '-g', '@microsoft/teams.cli@preview'],
      display: 'pnpm install -g @microsoft/teams.cli@preview',
    });
  });

  it('does not build a self-update command when the global install path is not writable', async () => {
    const { getSelfUpdateCommand, getSelfUpdateUnavailableInstruction } = await importSelfUpdateWithMocks({
      filename: '/opt/node/lib/node_modules/@microsoft/teams.cli/dist/utils/self-update.js',
      execPath: '/opt/node/bin/node',
      commandOutputs: {
        'npm root -g': '/opt/node/lib/node_modules',
      },
      writable: false,
    });

    expect(getSelfUpdateCommand()).toBeUndefined();
    expect(getSelfUpdateUnavailableInstruction()).toContain('install path is not writable');
  });
});
