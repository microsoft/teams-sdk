import { spawn, spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve, sep, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGE_NAME, UPDATE_SPEC } from './update-info.js';

export type InstallMethod = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';

interface SelfUpdateCommandStep {
  command: string;
  args: string[];
  display: string;
}

export interface SelfUpdateCommand extends SelfUpdateCommandStep {
  steps?: SelfUpdateCommandStep[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function quoteArg(arg: string): string {
  return /\s/.test(arg) ? `"${arg}"` : arg;
}

function makeStep(command: string, args: string[]): SelfUpdateCommandStep {
  return {
    command,
    args,
    display: [command, ...args].map(quoteArg).join(' '),
  };
}

function readCommandOutput(
  command: string,
  args: string[],
  options: { requireSuccess?: boolean } = {}
): string | undefined {
  const result = spawnSync(command, args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: shouldUseWindowsShell(command),
  });

  if (result.status === 0) return result.stdout.trim() || undefined;

  if (options.requireSuccess) {
    const reason = result.error?.message || result.stderr.trim() || `exit code ${result.status ?? 'unknown'}`;
    throw new Error(`Failed to run ${[command, ...args].join(' ')}: ${reason}`);
  }

  return undefined;
}

function shouldUseWindowsShell(command: string): boolean {
  return process.platform === 'win32' && !command.includes('/') && !command.includes('\\');
}

export function getPackageDir(): string {
  let dir = __dirname;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    dir = dirname(dir);
  }
  return __dirname;
}

export function detectInstallMethod(): InstallMethod {
  const resolvedPath = `${__dirname}\0${process.execPath || ''}`.toLowerCase().replace(/\\/g, '/');

  if (resolvedPath.includes('/pnpm/') || resolvedPath.includes('/.pnpm/')) return 'pnpm';
  if (resolvedPath.includes('/yarn/') || resolvedPath.includes('/.yarn/')) return 'yarn';
  if ('bun' in process.versions || resolvedPath.includes('/install/global/node_modules/')) return 'bun';
  if (resolvedPath.includes('/npm/') || resolvedPath.includes('/node_modules/')) return 'npm';

  return 'unknown';
}

function getInferredNpmInstall(): { root: string; prefix: string } | undefined {
  const packageDir = getPackageDir();
  const path = process.platform === 'win32' || packageDir.includes('\\') ? win32 : { basename, dirname };
  const parent = path.dirname(packageDir);
  let root: string | undefined;

  if (path.basename(parent).startsWith('@') && path.basename(path.dirname(parent)) === 'node_modules') {
    root = path.dirname(parent);
  } else if (path.basename(parent) === 'node_modules') {
    root = parent;
  }

  if (!root) return undefined;

  const rootParent = path.dirname(root);
  if (path.basename(rootParent) === 'lib') {
    return { root, prefix: path.dirname(rootParent) };
  }

  // Windows global npm prefixes use <prefix>\node_modules, which is hard to distinguish
  // from a local project install by path shape alone. Require npm root -g evidence there.
  return undefined;
}

function getSelfUpdateCommandForMethod(method: InstallMethod): SelfUpdateCommand | undefined {
  switch (method) {
    case 'npm': {
      const inferred = getInferredNpmInstall();
      const prefixArgs = inferred ? ['--prefix', inferred.prefix] : [];
      return makeStep('npm', [...prefixArgs, 'install', '-g', UPDATE_SPEC]);
    }
    case 'pnpm':
      return makeStep('pnpm', ['install', '-g', UPDATE_SPEC]);
    case 'yarn':
      return makeStep('yarn', ['global', 'add', UPDATE_SPEC]);
    case 'bun':
      return makeStep('bun', ['install', '-g', UPDATE_SPEC]);
    case 'unknown':
      return undefined;
  }
}

function getGlobalPackageRoots(method: InstallMethod): string[] {
  switch (method) {
    case 'npm': {
      const root = readCommandOutput('npm', ['root', '-g']);
      const inferred = getInferredNpmInstall();
      return [root, inferred?.root].filter((path): path is string => !!path);
    }
    case 'pnpm': {
      const root = readCommandOutput('pnpm', ['root', '-g']);
      return root ? [root, dirname(root)] : [];
    }
    case 'yarn': {
      const dir = readCommandOutput('yarn', ['global', 'dir']);
      return dir ? [dir, join(dir, 'node_modules')] : [];
    }
    case 'bun': {
      const bunBin = readCommandOutput('bun', ['pm', 'bin', '-g']);
      const roots = [join(homedir(), '.bun', 'install', 'global', 'node_modules')];
      if (bunBin) roots.push(join(dirname(bunBin), 'install', 'global', 'node_modules'));
      return roots;
    }
    case 'unknown':
      return [];
  }
}

function normalizeExistingPathForComparison(path: string): string | undefined {
  const resolvedPath = resolve(path);
  if (!existsSync(resolvedPath)) return undefined;

  try {
    const realPath = realpathSync(resolvedPath);
    return process.platform === 'win32' ? realPath.toLowerCase() : realPath;
  } catch {
    return undefined;
  }
}

function isManagedByGlobalPackageManager(method: InstallMethod): boolean {
  const packageDir = normalizeExistingPathForComparison(getPackageDir());
  if (!packageDir) return false;

  return getGlobalPackageRoots(method).some((root) => {
    const normalizedRoot = normalizeExistingPathForComparison(root);
    if (!normalizedRoot) return false;
    const rootWithSeparator = normalizedRoot.endsWith(sep) ? normalizedRoot : `${normalizedRoot}${sep}`;
    return packageDir.startsWith(rootWithSeparator);
  });
}

function isSelfUpdatePathWritable(): boolean {
  const packageDir = getPackageDir();
  try {
    accessSync(packageDir, constants.W_OK);
    accessSync(dirname(packageDir), constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function getSelfUpdateCommand(): SelfUpdateCommand | undefined {
  const method = detectInstallMethod();
  const command = getSelfUpdateCommandForMethod(method);

  if (!command) return undefined;
  if (!isManagedByGlobalPackageManager(method)) return undefined;
  if (!isSelfUpdatePathWritable()) return undefined;

  return command;
}

export function getSelfUpdateUnavailableInstruction(): string {
  const method = detectInstallMethod();
  const command = getSelfUpdateCommandForMethod(method);

  if (command) {
    if (isManagedByGlobalPackageManager(method) && !isSelfUpdatePathWritable()) {
      return `This installation is managed by a global ${method} install, but the install path is not writable. Update it yourself with: ${command.display}`;
    }

    return `This installation is not managed by a global ${method} install. Update it with the package manager, wrapper, or source checkout that provides it.`;
  }

  return `Update ${UPDATE_SPEC} using the package manager, wrapper, or source checkout that provides this installation.`;
}

export function getExecutableLocation(): string | undefined {
  return process.argv[1];
}

export async function runSelfUpdateCommand(command: SelfUpdateCommand): Promise<void> {
  for (const step of command.steps ?? [command]) {
    await new Promise<void>((resolvePromise, reject) => {
      const child = spawn(step.command, step.args, {
        stdio: 'inherit',
        shell: shouldUseWindowsShell(step.command),
      });

      child.on('error', reject);
      child.on('close', (code, signal) => {
        if (code === 0) {
          resolvePromise();
        } else if (signal) {
          reject(new Error(`${step.display} terminated by signal ${signal}`));
        } else {
          reject(new Error(`${step.display} exited with code ${code ?? 'unknown'}`));
        }
      });
    });
  }
}

export function getPackageName(): string {
  return PACKAGE_NAME;
}
