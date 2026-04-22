import AdmZip from 'adm-zip';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';
import { confirm } from '@inquirer/prompts';
import { downloadAppPackage, uploadManifest, type TeamsManifest } from '../../../apps/index.js';
import { CliError } from '../../../utils/errors.js';
import { isAutoConfirm } from '../../../utils/interactive.js';
import { logger } from '../../../utils/logger.js';
import { createSilentSpinner } from '../../../utils/spinner.js';
import { bumpPatchVersion, compareVersions } from '../../../utils/version.js';

export interface UploadResult {
  version?: string;
  versionBumped: boolean;
}

/**
 * Download manifest from an app package. Saves to file or prints to stdout.
 * Throws on failure.
 */
export async function downloadManifest(
  token: string,
  appId: string,
  filePath?: string
): Promise<void> {
  const spinner = createSilentSpinner('Downloading manifest...', false).start();

  let manifestJson: unknown;
  try {
    const packageBuffer = await downloadAppPackage(token, appId);
    const zip = new AdmZip(packageBuffer);
    const manifestEntry = zip.getEntry('manifest.json');

    if (!manifestEntry) {
      throw new Error('manifest.json not found in package');
    }

    const manifestContent = manifestEntry.getData().toString('utf-8');
    manifestJson = JSON.parse(manifestContent);
  } catch (error) {
    spinner.error({ text: error instanceof Error ? error.message : 'Download failed' });
    throw error;
  }

  spinner.success({ text: 'Manifest downloaded' });

  if (filePath) {
    await writeFile(filePath, JSON.stringify(manifestJson, null, 2));
    logger.info(pc.green(`Manifest saved to ${filePath}`));
  } else {
    logger.info(JSON.stringify(manifestJson, null, 2));
  }
}

/**
 * Upload a local manifest.json to update an existing app.
 * Reads the file, validates it's a Teams manifest, and uploads via TDP import.
 * Optionally auto-bumps the version if content changed but version didn't.
 * Returns upload result, or undefined if the user cancelled.
 */
export async function uploadManifestFromFile(
  token: string,
  teamsAppId: string,
  filePath: string,
  silent = false,
  autoBumpVersion = true
): Promise<UploadResult | undefined> {
  const resolved = path.resolve(filePath);

  let raw: string;
  try {
    raw = await readFile(resolved, 'utf-8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new CliError('VALIDATION_MISSING', `File not found: ${resolved}`);
    }
    throw new CliError('VALIDATION_FORMAT', `Cannot read file: ${resolved}`);
  }

  let manifest: TeamsManifest;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new CliError('VALIDATION_FORMAT', `File does not contain a JSON object: ${resolved}`);
    }
    manifest = parsed as TeamsManifest;
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('VALIDATION_FORMAT', `File is not valid JSON: ${resolved}`);
  }

  const missing: string[] = [];
  if (!manifest.id) missing.push('id');
  if (!manifest.version) missing.push('version');
  if (!manifest.manifestVersion) missing.push('manifestVersion');
  if (!manifest.name?.short) missing.push('name.short');
  if (!manifest.description?.short) missing.push('description.short');
  if (!manifest.developer?.name) missing.push('developer.name');
  if (!manifest.developer?.websiteUrl) missing.push('developer.websiteUrl');
  if (!manifest.developer?.privacyUrl) missing.push('developer.privacyUrl');
  if (!manifest.developer?.termsOfUseUrl) missing.push('developer.termsOfUseUrl');

  if (missing.length > 0) {
    if (silent) {
      throw new CliError(
        'VALIDATION_FORMAT',
        `Manifest is missing required fields: ${missing.join(', ')}`,
        'See https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema for the full schema.'
      );
    }
    logger.warn(pc.yellow(`Manifest is missing fields: ${missing.join(', ')}`));
    if (!isAutoConfirm()) {
      const proceed = await confirm({ message: 'Upload anyway?', default: false });
      if (!proceed) return undefined;
    }
  }

  // Auto-bump version if enabled and version is parseable
  let versionBumped = false;
  if (autoBumpVersion && manifest.version) {
    try {
      const packageBuffer = await downloadAppPackage(token, teamsAppId);
      const zip = new AdmZip(packageBuffer);
      const serverEntry = zip.getEntry('manifest.json');

      if (serverEntry) {
        const serverManifest = JSON.parse(serverEntry.getData().toString('utf-8'));
        const serverVersion: string = serverManifest.version ?? '';
        const cmp = compareVersions(manifest.version, serverVersion);

        if (cmp === 0) {
          // Same version — bump if content actually changed
          const { version: _sv, ...serverCopy } = serverManifest;
          const { version: _lv, ...localCopy } = manifest;
          const stableStringify = (obj: unknown) =>
            JSON.stringify(obj, (_key, value) =>
              value && typeof value === 'object' && !Array.isArray(value)
                ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
                : value
            );
          const contentChanged = stableStringify(serverCopy) !== stableStringify(localCopy);

          if (contentChanged) {
            const bumped = bumpPatchVersion(manifest.version);
            if (bumped) {
              if (!silent) {
                logger.info(pc.dim(`Version auto-bumped: ${manifest.version} → ${bumped}`));
              }
              manifest = { ...manifest, version: bumped };
              versionBumped = true;
            }
          }
        }
      }
    } catch {
      // Failed to download/compare (e.g. first upload) — skip auto-bumping
    }
  }

  const spinner = createSilentSpinner('Uploading manifest...', silent).start();
  try {
    await uploadManifest(token, teamsAppId, JSON.stringify(manifest, null, 2));
  } catch (error) {
    spinner.error({ text: 'Upload failed' });
    throw error;
  }
  spinner.success({ text: 'Manifest uploaded' });

  if (!silent) {
    logger.info(
      pc.green(`Manifest from ${pc.bold(resolved)} applied to app ${pc.bold(teamsAppId)}`)
    );
  }

  return { version: manifest.version, versionBumped };
}
