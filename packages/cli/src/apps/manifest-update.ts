import AdmZip from 'adm-zip';
import { getProperty, hasProperty } from 'dot-prop';
import { downloadAppPackage, uploadManifestFromPackage } from './api.js';
import {
  formatManifestValidationIssues,
  validateTeamsManifestSchema,
} from './manifest-validation.js';
import { CliError } from '../utils/errors.js';
import { bumpPatchVersion, stableStringify } from '../utils/version.js';
import { applyManifestMutations, type ManifestChange, type ManifestMutationOptions } from './manifest-mutate.js';

export interface UnpreservedManifestChange {
  path: string;
  expected?: unknown;
  actual?: unknown;
  kind: ManifestChange['kind'];
}

export interface ApplyManifestUpdateOptions {
  token: string;
  teamsAppId: string;
  mutations: ManifestMutationOptions;
  dryRun?: boolean;
  bumpVersion?: boolean;
  verifyUpload?: boolean;
}

export interface ApplyManifestUpdateResult {
  teamsAppId: string;
  dryRun: boolean;
  version?: string;
  previousVersion?: string;
  versionBumped: boolean;
  changes: ManifestChange[];
  manifest?: Record<string, unknown>;
  verified?: boolean;
  unpreservedChanges?: UnpreservedManifestChange[];
}

function assertManifestObject(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CliError('VALIDATION_FORMAT', 'Downloaded manifest is not a JSON object.');
  }
}

interface DownloadedManifestPackage {
  manifest: Record<string, unknown>;
  packageBuffer: Buffer;
}

function readManifestJsonFromPackage(packageBuffer: Buffer): Record<string, unknown> {
  const zip = new AdmZip(packageBuffer);
  const manifestEntry = zip.getEntry('manifest.json');

  if (!manifestEntry) {
    throw new CliError('VALIDATION_FORMAT', 'manifest.json not found in app package.');
  }

  const parsed: unknown = JSON.parse(manifestEntry.getData().toString('utf-8'));
  assertManifestObject(parsed);
  return parsed;
}

async function downloadManifestPackage(
  token: string,
  teamsAppId: string
): Promise<DownloadedManifestPackage> {
  const packageBuffer = await downloadAppPackage(token, teamsAppId);
  return { manifest: readManifestJsonFromPackage(packageBuffer), packageBuffer };
}

export async function downloadManifestJson(
  token: string,
  teamsAppId: string
): Promise<Record<string, unknown>> {
  return (await downloadManifestPackage(token, teamsAppId)).manifest;
}

function getActualValue(manifest: Record<string, unknown>, path: string): unknown {
  return hasProperty(manifest, path) ? getProperty(manifest, path) : undefined;
}

export function getUnpreservedManifestChanges(
  expectedManifest: Record<string, unknown>,
  persistedManifest: Record<string, unknown>,
  changes: ManifestChange[]
): UnpreservedManifestChange[] {
  const unpreservedChanges: UnpreservedManifestChange[] = [];

  for (const change of changes) {
    const persistedHasPath = hasProperty(persistedManifest, change.path);

    if (change.kind === 'removed') {
      if (persistedHasPath) {
        unpreservedChanges.push({
          path: change.path,
          kind: change.kind,
          expected: undefined,
          actual: getProperty(persistedManifest, change.path),
        });
      }
      continue;
    }

    const expected = getActualValue(expectedManifest, change.path);
    const actual = getActualValue(persistedManifest, change.path);
    if (!persistedHasPath || stableStringify(expected) !== stableStringify(actual)) {
      unpreservedChanges.push({ path: change.path, kind: change.kind, expected, actual });
    }
  }

  return unpreservedChanges;
}

async function verifyManifestUpdate(
  token: string,
  teamsAppId: string,
  expectedManifest: Record<string, unknown>,
  changes: ManifestChange[]
): Promise<UnpreservedManifestChange[]> {
  try {
    const persistedManifest = await downloadManifestJson(token, teamsAppId);
    return getUnpreservedManifestChanges(expectedManifest, persistedManifest, changes);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        path: '(verification)',
        kind: 'updated',
        expected: 'download updated manifest',
        actual: message,
      },
    ];
  }
}

export async function applyManifestUpdate(
  options: ApplyManifestUpdateOptions
): Promise<ApplyManifestUpdateResult> {
  const { manifest, packageBuffer } = await downloadManifestPackage(options.token, options.teamsAppId);
  const originalManifest = structuredClone(manifest);
  const changes = applyManifestMutations(manifest, options.mutations);

  if (changes.length === 0) {
    return {
      teamsAppId: options.teamsAppId,
      dryRun: !!options.dryRun,
      versionBumped: false,
      changes: [],
    };
  }

  const versionExplicitlySet = changes.some((change) => change.path === 'version');
  const previousVersion = typeof originalManifest.version === 'string' ? originalManifest.version : undefined;
  let versionBumped = false;

  if (options.bumpVersion !== false && !versionExplicitlySet && previousVersion) {
    const bumped = bumpPatchVersion(previousVersion);
    if (bumped) {
      manifest.version = bumped;
      versionBumped = true;
    }
  }

  const validation = await validateTeamsManifestSchema(manifest);
  if (!validation.valid) {
    throw new CliError(
      'VALIDATION_SCHEMA',
      `Manifest schema validation failed:\n${formatManifestValidationIssues(validation.issues)}`,
      'No changes uploaded.'
    );
  }

  const version = typeof manifest.version === 'string' ? manifest.version : undefined;

  if (options.dryRun) {
    return {
      teamsAppId: options.teamsAppId,
      dryRun: true,
      ...(version ? { version } : {}),
      ...(previousVersion ? { previousVersion } : {}),
      versionBumped,
      changes,
      manifest,
    };
  }

  if (stableStringify(originalManifest) === stableStringify(manifest)) {
    return {
      teamsAppId: options.teamsAppId,
      dryRun: false,
      ...(version ? { version } : {}),
      ...(previousVersion ? { previousVersion } : {}),
      versionBumped,
      changes: [],
    };
  }

  await uploadManifestFromPackage(options.token, packageBuffer, JSON.stringify(manifest, null, 2));

  const shouldVerify = options.verifyUpload !== false;
  const unpreservedChanges = shouldVerify
    ? await verifyManifestUpdate(options.token, options.teamsAppId, manifest, changes)
    : [];

  return {
    teamsAppId: options.teamsAppId,
    dryRun: false,
    ...(version ? { version } : {}),
    ...(previousVersion ? { previousVersion } : {}),
    versionBumped,
    changes,
    verified: shouldVerify ? unpreservedChanges.length === 0 : undefined,
    ...(unpreservedChanges.length > 0 ? { unpreservedChanges } : {}),
  };
}
