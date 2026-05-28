import {
  deleteProperty,
  getProperty,
  hasProperty,
  parsePath,
  setProperty,
} from 'dot-prop';
import { CliError } from '../utils/errors.js';
import { stableStringify } from '../utils/version.js';

export interface ManifestMutationOptions {
  setJson?: string[];
  remove?: string[];
}

export type ManifestChangeKind = 'added' | 'updated' | 'removed';

export interface ManifestChange {
  kind: ManifestChangeKind;
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
}

interface ParsedAssignment {
  path: string;
  value: string;
}

function parseAssignment(raw: string, flagName: string): ParsedAssignment {
  const equalsIndex = raw.indexOf('=');
  if (equalsIndex <= 0) {
    throw new CliError(
      'VALIDATION_FORMAT',
      `${flagName} must use path=value syntax (received: ${raw})`
    );
  }

  const path = raw.slice(0, equalsIndex).trim();
  if (!path) {
    throw new CliError('VALIDATION_FORMAT', `${flagName} path cannot be empty.`);
  }

  return { path, value: raw.slice(equalsIndex + 1) };
}

function parseJsonValue(path: string, rawValue: string): unknown {
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    throw new CliError('VALIDATION_FORMAT', `Invalid JSON for ${path}: ${rawValue}`);
  }
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

function setManifestPath(manifest: object, path: string, value: unknown): ManifestChange | undefined {
  const existed = hasProperty(manifest, path);
  const oldValue = existed ? getProperty(manifest, path) : undefined;

  setProperty(manifest, path, value);

  const newValue = getProperty(manifest, path);
  if (existed && valuesEqual(oldValue, newValue)) {
    return undefined;
  }

  return {
    kind: existed ? 'updated' : 'added',
    path,
    ...(existed ? { oldValue } : {}),
    newValue,
  };
}

function removeManifestPath(manifest: object, path: string): ManifestChange {
  if (!hasProperty(manifest, path)) {
    throw new CliError('VALIDATION_FORMAT', `Path does not exist: ${path}`);
  }

  const oldValue = getProperty(manifest, path);
  const segments = parsePath(path);
  if (segments.length === 0) {
    throw new CliError('VALIDATION_FORMAT', 'Cannot remove the manifest root.');
  }

  const lastSegment = segments.at(-1);
  const parentPath = segments.slice(0, -1);
  const parent = parentPath.length > 0 ? getProperty(manifest, parentPath) : manifest;

  if (Array.isArray(parent) && typeof lastSegment === 'number') {
    parent.splice(lastSegment, 1);
  } else {
    deleteProperty(manifest, path);
  }

  return { kind: 'removed', path, oldValue };
}

export function applyManifestMutations(
  manifest: object,
  options: ManifestMutationOptions
): ManifestChange[] {
  const changes: ManifestChange[] = [];

  for (const rawSetJson of options.setJson ?? []) {
    const { path, value } = parseAssignment(rawSetJson, '--set-json');
    const change = setManifestPath(manifest, path, parseJsonValue(path, value));
    if (change) changes.push(change);
  }

  for (const path of options.remove ?? []) {
    changes.push(removeManifestPath(manifest, path));
  }

  return changes;
}
