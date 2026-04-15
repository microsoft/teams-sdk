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
 * Reads the file, validates it's a Teams manifest, and uploads via TDP API.
 * Throws on failure.
 */
export async function uploadManifestFromFile(
  token: string,
  teamsAppId: string,
  filePath: string,
  silent = false
): Promise<void> {
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
      if (!proceed) return;
    }
  }

  const spinner = createSilentSpinner('Uploading manifest...', silent).start();
  try {
    await uploadManifest(token, teamsAppId, manifest);
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
}
