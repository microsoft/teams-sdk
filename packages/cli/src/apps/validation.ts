import type { TeamsManifest } from './api.js';
import { validateEndpoint } from './manifest.js';

export type ValidationMode = 'create' | 'update' | 'manifest';

export interface AppMetadataInput {
  shortName?: string;
  longName?: string;
  shortDescription?: string;
  longDescription?: string;
  developerName?: string;
  websiteUrl?: string;
  privacyUrl?: string;
  termsOfUseUrl?: string;
  endpoint?: string;
}

export type AppMetadataField = keyof AppMetadataInput;

export interface ValidationIssue {
  field: AppMetadataField;
  message: string;
}

interface FieldRule {
  label: string;
  maxLength?: number;
  requiredIn: ValidationMode[];
  allowEmpty?: boolean;
  emptyMessage?: string;
  validate?: (value: string) => string | null;
}

const HTTPS_URL_REGEX = /^https:\/\/\S+$/i;

const FIELD_RULES: Record<AppMetadataField, FieldRule> = {
  shortName: {
    label: 'Short name',
    maxLength: 30,
    requiredIn: ['create', 'manifest'],
  },
  longName: {
    label: 'Long name',
    maxLength: 100,
    requiredIn: [],
    allowEmpty: true,
  },
  shortDescription: {
    label: 'Short description',
    maxLength: 80,
    requiredIn: ['create', 'manifest'],
  },
  longDescription: {
    label: 'Long description',
    maxLength: 4000,
    requiredIn: ['create', 'manifest'],
  },
  developerName: {
    label: 'Developer name',
    requiredIn: ['create', 'manifest'],
  },
  websiteUrl: {
    label: 'Website URL',
    requiredIn: ['create', 'manifest'],
    validate: (value) => validateHttpsUrl(value, 'Website URL'),
  },
  privacyUrl: {
    label: 'Privacy URL',
    requiredIn: ['create', 'manifest'],
    validate: (value) => validateHttpsUrl(value, 'Privacy URL'),
  },
  termsOfUseUrl: {
    label: 'Terms of use URL',
    requiredIn: ['create', 'manifest'],
    validate: (value) => validateHttpsUrl(value, 'Terms of use URL'),
  },
  endpoint: {
    label: 'Endpoint URL',
    requiredIn: [],
    emptyMessage: 'Endpoint URL cannot be empty.',
    validate: (value) => validateEndpoint(value),
  },
};

export function normalizeAppMetadata(input: AppMetadataInput): AppMetadataInput {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ])
  ) as AppMetadataInput;
}

export function validateAppMetadataField(
  field: AppMetadataField,
  value: string | undefined,
  mode: ValidationMode
): string | null {
  const rule = FIELD_RULES[field];
  const normalizedValue = typeof value === 'string' ? value.trim() : value;
  const isRequired = rule.requiredIn.includes(mode);

  if (normalizedValue === undefined) {
    return isRequired ? `${rule.label} is required.` : null;
  }

  if (!normalizedValue) {
    if (isRequired) {
      return `${rule.label} is required.`;
    }
    if (rule.allowEmpty) {
      return null;
    }
    return rule.emptyMessage ?? `${rule.label} is required.`;
  }

  if (rule.maxLength && normalizedValue.length > rule.maxLength) {
    return `${rule.label} must be ${rule.maxLength} characters or less.`;
  }

  return rule.validate?.(normalizedValue) ?? null;
}

export function validateAppMetadata(
  input: AppMetadataInput,
  mode: ValidationMode
): ValidationIssue[] {
  const normalized = normalizeAppMetadata(input);
  const issues: ValidationIssue[] = [];

  for (const field of Object.keys(FIELD_RULES) as AppMetadataField[]) {
    const value = normalized[field];
    if (mode === 'update' && value === undefined) {
      continue;
    }

    const error = validateAppMetadataField(field, value, mode);
    if (error) {
      issues.push({ field, message: error });
    }
  }

  return issues;
}

export function appMetadataFromManifest(manifest: TeamsManifest): AppMetadataInput {
  return {
    shortName: manifest.name?.short,
    longName: manifest.name?.full,
    shortDescription: manifest.description?.short,
    longDescription: manifest.description?.full,
    developerName: manifest.developer?.name,
    websiteUrl: manifest.developer?.websiteUrl,
    privacyUrl: manifest.developer?.privacyUrl,
    termsOfUseUrl: manifest.developer?.termsOfUseUrl,
  };
}

function validateHttpsUrl(value: string, label: string): string | null {
  return HTTPS_URL_REGEX.test(value)
    ? null
    : `${label} must start with https:// and include a domain.`;
}
