import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  detectCsharpProjectDir,
  resolveCredentialDestination,
} from '../src/utils/credential-destination.js';

function mkTempDir(): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-creddest-')));
}

// ── detectCsharpProjectDir ───────────────────────────────────────────

describe('detectCsharpProjectDir', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it('detects a .csproj in the given directory', () => {
    const dir = mkTempDir();
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, 'MyApp.csproj'), '<Project />');

    expect(detectCsharpProjectDir(dir)).toBe(dir);
  });

  it('detects a .csproj nested one level down (solution root)', () => {
    const root = mkTempDir();
    dirs.push(root);
    fs.writeFileSync(path.join(root, 'MyApp.sln'), '');
    const inner = path.join(root, 'MyApp');
    fs.mkdirSync(inner);
    fs.writeFileSync(path.join(inner, 'MyApp.csproj'), '<Project />');

    expect(detectCsharpProjectDir(root)).toBe(inner);
  });

  it('returns undefined when there is no .csproj', () => {
    const dir = mkTempDir();
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, 'package.json'), '{}');

    expect(detectCsharpProjectDir(dir)).toBeUndefined();
  });

  it('ignores node_modules and dot directories when searching subdirs', () => {
    const dir = mkTempDir();
    dirs.push(dir);
    const nm = path.join(dir, 'node_modules', 'pkg');
    fs.mkdirSync(nm, { recursive: true });
    fs.writeFileSync(path.join(nm, 'Hidden.csproj'), '<Project />');
    const hidden = path.join(dir, '.hidden');
    fs.mkdirSync(hidden);
    fs.writeFileSync(path.join(hidden, 'Hidden.csproj'), '<Project />');

    expect(detectCsharpProjectDir(dir)).toBeUndefined();
  });
});

// ── resolveCredentialDestination (non-interactive paths) ─────────────

describe('resolveCredentialDestination', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it('returns the explicit path when provided (wins over everything)', async () => {
    const result = await resolveCredentialDestination({
      explicit: 'custom/.env',
      interactive: true,
      cwd: process.cwd(),
    });
    expect(result).toBe('custom/.env');
  });

  it('falls back to appsettings.json for a C# project in the default flow', async () => {
    const dir = mkTempDir();
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, 'MyApp.csproj'), '<Project />');

    const result = await resolveCredentialDestination({
      interactive: false,
      json: false,
      cwd: dir,
    });
    expect(result).toBe(path.join(dir, 'appsettings.json'));
  });

  it('falls back to appsettings.json in the nested project dir', async () => {
    const root = mkTempDir();
    dirs.push(root);
    const inner = path.join(root, 'MyApp');
    fs.mkdirSync(inner);
    fs.writeFileSync(path.join(inner, 'MyApp.csproj'), '<Project />');

    const result = await resolveCredentialDestination({
      interactive: false,
      json: false,
      cwd: root,
    });
    expect(result).toBe(path.join(inner, 'appsettings.json'));
  });

  it('returns undefined for a C# project in JSON mode (no implicit write)', async () => {
    const dir = mkTempDir();
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, 'MyApp.csproj'), '<Project />');

    const result = await resolveCredentialDestination({
      interactive: false,
      json: true,
      cwd: dir,
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined (terminal) for a non-C# project in the default flow', async () => {
    const dir = mkTempDir();
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, 'package.json'), '{}');

    const result = await resolveCredentialDestination({
      interactive: false,
      json: false,
      cwd: dir,
    });
    expect(result).toBeUndefined();
  });
});
