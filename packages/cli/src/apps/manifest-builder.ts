import { input, checkbox } from '@inquirer/prompts';
import pc from 'picocolors';
import { isInteractive } from '../utils/interactive.js';
import { logger } from '../utils/logger.js';
import type { BotScope } from './manifest.js';
import { validateAppMetadataField, type AppMetadataField } from './validation.js';

/**
 * Wraps `validateAppMetadataField` for inquirer's `validate` callback.
 * Returns `true` when valid, or the error message string when invalid.
 */
function validateField(field: AppMetadataField, value: string): string | true {
  return validateAppMetadataField(field, value, 'create') ?? true;
}

/**
 * Validates an optional field. Empty values are accepted so callers can apply a fallback.
 */
function validateOptionalField(field: AppMetadataField, value: string): string | true {
  return value.trim() ? validateField(field, value) : true;
}

/**
 * Placeholder bot ID for manifest generation when no real bot ID is available.
 */
export const PLACEHOLDER_BOT_ID = '00000000-0000-0000-0000-000000000000';

export interface ManifestCustomization {
  description?: { short: string; full?: string };
  icons?: { colorIconPath?: string; outlineIconPath?: string };
  scopes?: BotScope[];
  developer?: {
    name: string;
    websiteUrl: string;
    privacyUrl: string;
    termsOfUseUrl: string;
  };
}

/**
 * Interactively collects manifest customization options from the user.
 * Prompts for description, icons, scopes, and developer details.
 */
export async function collectManifestCustomization(): Promise<ManifestCustomization> {
  if (!isInteractive()) {
    return {};
  }

  const customizeFields = await checkbox({
    message: 'Customize manifest fields? (space to select, enter to continue)',
    choices: [
      { name: 'Description', value: 'description' },
      { name: 'Icons', value: 'icons' },
      { name: 'Scopes', value: 'scopes' },
      { name: 'Developer details', value: 'developer' },
    ],
  });

  const result: ManifestCustomization = {};

  if (customizeFields.includes('description')) {
    const shortDesc = await input({
      message: 'Short description:',
      validate: (value) => validateField('shortDescription', value),
    });
    const fullDesc = await input({
      message: 'Full description (leave empty to use short):',
      validate: (value) => validateOptionalField('longDescription', value),
    });
    result.description = { short: shortDesc, full: fullDesc.trim() || undefined };
  }

  if (customizeFields.includes('icons')) {
    const colorIconPath =
      (await input({ message: 'Color icon path (192x192 PNG, leave empty to skip):' })) ||
      undefined;
    const outlineIconPath =
      (await input({ message: 'Outline icon path (32x32 PNG, leave empty to skip):' })) ||
      undefined;
    if (colorIconPath || outlineIconPath) {
      result.icons = { colorIconPath, outlineIconPath };
    }
  }

  if (customizeFields.includes('scopes')) {
    while (true) {
      const scopes = await checkbox<BotScope>({
        message: 'Select bot scopes:',
        choices: [
          { name: 'Personal', value: 'personal', checked: true },
          { name: 'Team', value: 'team', checked: true },
          { name: 'Group Chat', value: 'groupChat', checked: true },
          { name: 'Copilot', value: 'copilot' },
        ],
      });

      if (scopes.length > 0) {
        result.scopes = scopes;
        break;
      }

      logger.warn(pc.yellow('Select at least 1 scope.'));
    }
  }

  if (customizeFields.includes('developer')) {
    const devName = await input({
      message: 'Developer name:',
      validate: (value) => validateField('developerName', value),
    });
    const websiteUrl = await input({
      message: 'Website URL:',
      validate: (value) => validateField('websiteUrl', value),
    });
    const privacyUrl = await input({
      message: 'Privacy URL:',
      validate: (value) => validateField('privacyUrl', value),
    });
    const termsUrl = await input({
      message: 'Terms of use URL:',
      validate: (value) => validateField('termsOfUseUrl', value),
    });
    result.developer = {
      name: devName,
      websiteUrl,
      privacyUrl,
      termsOfUseUrl: termsUrl,
    };
  }

  return result;
}
