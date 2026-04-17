/**
 * Bump the patch (last) segment of a dotted version string.
 * Returns null if the version can't be parsed.
 */
export function bumpPatchVersion(version: string): string | null {
  const parts = version.split('.');
  if (parts.length < 2 || parts.length > 3) return null;
  const last = parseInt(parts[parts.length - 1], 10);
  if (isNaN(last)) return null;
  parts[parts.length - 1] = String(last + 1);
  return parts.join('.');
}

/**
 * Compare two dotted version strings numerically.
 * Returns 1 if a > b, -1 if a < b, 0 if equal, null if unparseable.
 */
export function compareVersions(a: string, b: string): number | null {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  if (pa.some(isNaN) || pb.some(isNaN)) return null;
  const maxLen = Math.max(pa.length, pb.length);
  for (let i = 0; i < maxLen; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}
