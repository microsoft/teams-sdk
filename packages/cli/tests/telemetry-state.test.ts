import { mkdtemp, rm } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ realpath: vi.fn<(path: string) => Promise<string>>() }));
vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  realpath: mocks.realpath,
}));

import { TelemetryState } from '../src/telemetry/state.js';

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe('telemetry target normalization', () => {
  it('preserves nonexistent root children without colliding with an existing sibling', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'teams-telemetry-root-'));
    directories.push(directory);
    const root = parse(directory).root;
    const existing = join(root, 'agent');
    const missing = join(root, 'xagent');
    mocks.realpath.mockImplementation(async (path) => {
      if (path === root || path === existing) return path;
      throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
    });
    const state = new TelemetryState(join(directory, 'state.json'));
    await state.setEnrollment('on');
    const first = await state.attempt(existing, 'project.create');
    const second = await state.attempt(missing, 'project.create');
    const nested = await state.attempt(join(missing, 'child'), 'project.create');
    const normalize = (path: string): string =>
      process.platform === 'win32' ? path.toLowerCase() : path;
    expect(second?.target).toBe(normalize(missing));
    expect(second?.id).not.toBe(first?.id);
    expect(nested?.target).toBe(normalize(join(missing, 'child')));
    expect((await state.resolveAttempt(missing))?.id).toBe(second?.id);
  });
});
