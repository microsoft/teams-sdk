import { createRequire } from 'node:module';

export const PACKAGE_NAME = '@microsoft/teams.cli';
export const UPDATE_TAG = 'preview';
export const UPDATE_SPEC = `${PACKAGE_NAME}@${UPDATE_TAG}`;
export const REGISTRY_API = `https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}/${UPDATE_TAG}`;

interface RegistryDistTagResponse {
  version?: string;
}

export function getCurrentVersion(): string {
  const require = createRequire(import.meta.url);
  const { version } = require('../../package.json') as { version: string };
  return version;
}

export async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(REGISTRY_API, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as RegistryDistTagResponse;
    return data.version ?? null;
  } catch {
    return null;
  }
}

interface ParsedVersion {
  core: number[];
  prerelease: string[];
}

function parseVersion(version: string): ParsedVersion | null {
  const normalized = version.trim().replace(/^v/, '').split('+')[0];
  const prereleaseSeparator = normalized.indexOf('-');
  const corePart = prereleaseSeparator === -1 ? normalized : normalized.slice(0, prereleaseSeparator);
  const prereleasePart = prereleaseSeparator === -1 ? '' : normalized.slice(prereleaseSeparator + 1);
  const coreParts = corePart.split('.');

  if (coreParts.length === 0 || coreParts.length > 3 || coreParts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }

  const core = coreParts.map((part) => Number(part));
  while (core.length < 3) core.push(0);

  return {
    core,
    prerelease: prereleasePart ? prereleasePart.split('.') : [],
  };
}

function compareIdentifiers(left: string, right: string): number {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);

  if (leftNumeric && rightNumeric) {
    return Number(left) - Number(right);
  }
  if (leftNumeric) return -1;
  if (rightNumeric) return 1;
  if (left > right) return 1;
  if (left < right) return -1;
  return 0;
}

export function compareCliVersions(leftVersion: string, rightVersion: string): number {
  const left = parseVersion(leftVersion);
  const right = parseVersion(rightVersion);

  if (!left || !right) {
    return leftVersion.localeCompare(rightVersion);
  }

  for (let index = 0; index < 3; index++) {
    const difference = left.core[index] - right.core[index];
    if (difference !== 0) return difference;
  }

  if (left.prerelease.length === 0 && right.prerelease.length === 0) return 0;
  if (left.prerelease.length === 0) return 1;
  if (right.prerelease.length === 0) return -1;

  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index++) {
    const leftIdentifier = left.prerelease[index];
    const rightIdentifier = right.prerelease[index];

    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;

    const difference = compareIdentifiers(leftIdentifier, rightIdentifier);
    if (difference !== 0) return difference;
  }

  return 0;
}

export function isNewerVersion(latest: string, current = getCurrentVersion()): boolean {
  return compareCliVersions(latest, current) > 0;
}
