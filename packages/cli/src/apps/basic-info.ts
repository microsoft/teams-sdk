import { select, input } from '@inquirer/prompts';
import pc from 'picocolors';
import { createSpinner } from 'nanospinner';
import type { AppDetails } from './types.js';
import { updateAppDetails } from './api.js';
import { validateAppMetadataField, type AppMetadataField } from './validation.js';
import { logger } from '../utils/logger.js';

interface FieldConfig {
  key: keyof AppDetails;
  label: string;
  maxLength?: number;
  required: boolean;
  validate?: (value: string) => string | true;
}

const FIELDS: FieldConfig[] = [
  { key: 'shortName', label: 'Short name', maxLength: 30, required: true },
  { key: 'longName', label: 'Long name', maxLength: 100, required: false },
  { key: 'shortDescription', label: 'Short description', maxLength: 80, required: true },
  { key: 'longDescription', label: 'Long description', maxLength: 4000, required: true },
  { key: 'version', label: 'Version', required: true },
  { key: 'developerName', label: 'Developer name', required: true },
  { key: 'websiteUrl', label: 'Website URL', required: true },
  { key: 'privacyUrl', label: 'Privacy URL', required: true },
  { key: 'termsOfUseUrl', label: 'Terms of Use URL', required: true },
];

function isMetadataField(key: keyof AppDetails): key is AppMetadataField {
  switch (key) {
    case 'shortName':
    case 'longName':
    case 'shortDescription':
    case 'longDescription':
    case 'developerName':
    case 'websiteUrl':
    case 'privacyUrl':
    case 'termsOfUseUrl':
      return true;
    default:
      return false;
  }
}

function truncateValue(value: string | undefined | null, maxLength: number = 40): string {
  const str = value ?? '';
  if (str.length > maxLength) {
    return str.substring(0, maxLength - 3) + '...';
  }
  return str;
}

function buildFieldChoices(appDetails: AppDetails) {
  return FIELDS.map((field) => {
    const currentValue = appDetails[field.key] as string | undefined;
    const displayValue = truncateValue(currentValue);
    const maxLengthHint = field.maxLength ? ` (max ${field.maxLength})` : '';
    return {
      name: `${field.label}${maxLengthHint}: ${pc.dim(displayValue || '(empty)')}`,
      value: field.key,
    };
  });
}

async function editField(
  appDetails: AppDetails,
  token: string,
  fieldKey: keyof AppDetails
): Promise<AppDetails | null> {
  const field = FIELDS.find((f) => f.key === fieldKey);
  if (!field) {
    logger.error(pc.red(`Unknown field: ${String(fieldKey)}`));
    return null;
  }

  const currentValue = (appDetails[fieldKey] as string) ?? '';
  const maxLengthHint = field.maxLength ? ` (max ${field.maxLength} chars)` : '';

  const newValue = await input({
    message: `Enter new ${field.label.toLowerCase()}${maxLengthHint}:`,
    default: currentValue,
    validate: (value) => {
      if (isMetadataField(field.key)) {
        return validateAppMetadataField(field.key, value, 'manifest') ?? true;
      }

      // Check required
      if (field.required && !value.trim()) {
        return `${field.label} is required`;
      }
      // Check max length
      if (field.maxLength && value.length > field.maxLength) {
        return `${field.label} must be ${field.maxLength} characters or less (currently ${value.length})`;
      }
      // Custom validation
      if (field.validate) {
        return field.validate(value);
      }
      return true;
    },
  });

  if (newValue === currentValue) {
    logger.info(pc.dim('\nNo changes made.'));
    return null;
  }

  const spinner = createSpinner('Updating...').start();
  try {
    const updated = await updateAppDetails(token, appDetails.teamsAppId, {
      [fieldKey]: newValue.trim(),
    });
    spinner.success({ text: `${field.label} updated successfully` });
    if (updated.versionBumped) {
      logger.info(pc.dim(`Version auto-bumped: ${updated.previousVersion} → ${updated.version} — reinstall may be needed`));
    }
    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    spinner.error({ text: `Failed to update: ${message}` });
    return null;
  }
}

/**
 * Show the basic info editor for an app.
 * Returns the updated app details, or the original if no changes were made.
 */
export async function showBasicInfoEditor(
  appDetails: AppDetails,
  token: string
): Promise<AppDetails> {
  let currentDetails = appDetails;

  while (true) {
    const choices = [
      ...buildFieldChoices(currentDetails),
      { name: pc.dim('Back'), value: 'back' as const },
    ];

    const selected = await select({
      message: 'Which field would you like to edit?',
      choices,
    });

    if (selected === 'back') {
      return currentDetails;
    }

    const updated = await editField(currentDetails, token, selected as keyof AppDetails);
    if (updated) {
      currentDetails = updated;
    }

    logger.info(); // Add spacing before next prompt
  }
}
