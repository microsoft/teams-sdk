import { describe, expect, it } from 'vitest';
import { compareCliVersions, getCliVersionStatus, isNewerVersion } from '../src/utils/update-info.js';

describe('getCliVersionStatus', () => {
  it('flags an update when latest is newer', async () => {
    expect(await getCliVersionStatus(async () => '3.0.4', '3.0.3')).toEqual({
      current: '3.0.3',
      latest: '3.0.4',
      updateAvailable: true,
    });
  });

  it('does not flag an update when current is latest or a newer prerelease', async () => {
    expect((await getCliVersionStatus(async () => '3.0.4', '3.0.4')).updateAvailable).toBe(false);
    expect((await getCliVersionStatus(async () => '3.0.4', '3.1.0-preview.7')).updateAvailable).toBe(false);
  });

  it('does not flag an update when the registry is unreachable', async () => {
    expect(await getCliVersionStatus(async () => null, '3.0.3')).toEqual({
      current: '3.0.3',
      latest: null,
      updateAvailable: false,
    });
  });
});

describe('version comparison', () => {
  it('compares normal semver versions', () => {
    expect(compareCliVersions('3.0.1', '3.0.0')).toBeGreaterThan(0);
    expect(compareCliVersions('3.0.0', '3.0.1')).toBeLessThan(0);
    expect(compareCliVersions('3.0.0', '3.0.0')).toBe(0);
  });

  it('compares prerelease versions numerically', () => {
    expect(compareCliVersions('3.0.0-beta.10', '3.0.0-beta.2')).toBeGreaterThan(0);
    expect(compareCliVersions('3.0.0-beta.2', '3.0.0-beta.10')).toBeLessThan(0);
  });

  it('treats stable releases as newer than prereleases with the same core version', () => {
    expect(compareCliVersions('3.0.0', '3.0.0-beta.10')).toBeGreaterThan(0);
    expect(compareCliVersions('3.0.0-beta.10', '3.0.0')).toBeLessThan(0);
  });

  it('exposes an is-newer helper', () => {
    expect(isNewerVersion('3.0.0-beta.10', '3.0.0-beta.2')).toBe(true);
    expect(isNewerVersion('3.0.0-beta.2', '3.0.0-beta.10')).toBe(false);
  });
});
