import { describe, it, expect } from 'vitest';
import { bumpPatchVersion, compareVersions } from '../src/utils/version.js';

describe('bumpPatchVersion', () => {
  it('bumps patch segment of 3-part version', () => {
    expect(bumpPatchVersion('1.0.0')).toBe('1.0.1');
  });

  it('bumps patch segment of 2-part version', () => {
    expect(bumpPatchVersion('1.0')).toBe('1.1');
  });

  it('handles large numbers', () => {
    expect(bumpPatchVersion('2.3.99')).toBe('2.3.100');
  });

  it('returns null for single segment', () => {
    expect(bumpPatchVersion('1')).toBeNull();
  });

  it('returns null for 4+ segments', () => {
    expect(bumpPatchVersion('1.2.3.4')).toBeNull();
  });

  it('returns null for non-numeric last segment', () => {
    expect(bumpPatchVersion('1.0.beta')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(bumpPatchVersion('')).toBeNull();
  });
});

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('returns 1 when first is greater (patch)', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  });

  it('returns -1 when first is less (patch)', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
  });

  it('returns 1 when first is greater (minor)', () => {
    expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
  });

  it('returns 1 when first is greater (major)', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
  });

  it('treats missing segments as 0', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
  });

  it('compares different-length versions correctly', () => {
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
  });

  it('returns null for non-numeric version a', () => {
    expect(compareVersions('abc', '1.0.0')).toBeNull();
  });

  it('returns null for non-numeric version b', () => {
    expect(compareVersions('1.0.0', 'x.y.z')).toBeNull();
  });

  it('returns null for empty segments', () => {
    expect(compareVersions('1..0', '1.0.0')).toBeNull();
  });

  it('returns null for trailing dot', () => {
    expect(compareVersions('1.', '1.0')).toBeNull();
  });
});
