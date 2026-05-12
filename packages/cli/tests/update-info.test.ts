import { describe, expect, it } from 'vitest';
import { compareCliVersions, isNewerVersion } from '../src/utils/update-info.js';

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
