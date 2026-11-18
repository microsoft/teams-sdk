import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { OrbitRegionConfig } from '../src/utils/config.js';

let directory: string;
let config: typeof import('../src/utils/config.js');
const region: OrbitRegionConfig = {
  homeAccountId: 'home-id',
  tenantId: 'tenant-id',
  environment: 'login.microsoftonline.com',
  baseUrl: 'https://dev.teams.microsoft.com/synthetic-route',
};

describe('CLI configuration and internal Orbit routing', () => {
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'teams-orbit-region-'));
    vi.resetModules();
    vi.doMock('../src/auth/config.js', () => ({ paths: { config: directory } }));
    config = await import('../src/utils/config.js');
  });

  afterEach(async () => {
    vi.doUnmock('../src/auth/config.js');
    vi.resetModules();
    await rm(directory, { recursive: true, force: true });
  });

  it('persists routing across module reloads, with no expiry or temporary files left behind', async () => {
    await config.setConfig('default-bot-location', 'azure');
    expect(await config.readOrbitRegion()).toBeUndefined();
    await config.writeOrbitRegion(region);
    vi.resetModules();
    config = await import('../src/utils/config.js');
    expect(await config.readOrbitRegion()).toEqual(region);
    expect(await config.getConfig('default-bot-location')).toBe('azure');
    expect(await readdir(directory)).toEqual(['config.json']);
    if (process.platform !== 'win32') {
      expect((await stat(join(directory, 'config.json'))).mode & 0o777).toBe(0o600);
    }
    expect(JSON.parse(await readFile(join(directory, 'config.json'), 'utf8'))).toEqual({
      'default-bot-location': 'azure', orbitRegion: region,
    });
  });

  it('replaces the saved route and can clear it idempotently at logout', async () => {
    await config.setConfig('default-bot-location', 'azure');
    await config.writeOrbitRegion(region);
    const updated = { ...region, baseUrl: 'https://dev.teams.microsoft.com/updated-route' };
    await config.writeOrbitRegion(updated);
    expect(await config.readOrbitRegion()).toEqual(updated);
    await config.clearOrbitRegion();
    await config.clearOrbitRegion();
    expect(await config.readOrbitRegion()).toBeUndefined();
    expect(JSON.parse(await readFile(join(directory, 'config.json'), 'utf8'))).toEqual({
      'default-bot-location': 'azure',
    });
  });

  it('preserves the internal route when updating public configuration', async () => {
    await config.writeOrbitRegion(region);
    await config.setConfig('default-bot-location', 'tm');
    expect(await config.readOrbitRegion()).toEqual(region);
    expect(await config.getConfig('default-bot-location')).toBe('tm');
    expect(await config.getConfig('orbitRegion')).toBeUndefined();
    await expect(config.setConfig('orbitRegion', 'manual-override')).rejects.toMatchObject({
      code: 'VALIDATION_FORMAT',
    });
    expect(await config.readOrbitRegion()).toEqual(region);
  });

  it('does not create configuration when clearing a missing internal route', async () => {
    await config.clearOrbitRegion();
    expect(await readdir(directory)).toEqual([]);
  });

  it.each(['{invalid', '[]', 'null', '{"orbitRegion":{"baseUrl":123}}'])('does not overwrite invalid configuration: %s', async text => {
    await writeFile(join(directory, 'config.json'), text);
    await expect(config.readOrbitRegion()).rejects.toMatchObject({ code: 'API_ERROR' });
    await expect(config.writeOrbitRegion(region)).rejects.toMatchObject({ code: 'API_ERROR' });
    expect(await readFile(join(directory, 'config.json'), 'utf8')).toBe(text);
  });
});
