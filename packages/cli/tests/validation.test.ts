import { describe, it, expect } from 'vitest';
import {
  appMetadataFromManifest,
  validateAppMetadata,
  validateAppMetadataField,
} from '../src/apps/validation.js';

describe('shared app metadata validation', () => {
  it('rejects short name over 30 characters in create mode', () => {
    const issues = validateAppMetadata(
      {
        shortName: 'x'.repeat(31),
        longName: 'Valid Long Name',
        shortDescription: 'Short description',
        longDescription: 'Long description',
        developerName: 'Developer',
        websiteUrl: 'https://example.com',
        privacyUrl: 'https://example.com/privacy',
        termsOfUseUrl: 'https://example.com/terms',
      },
      'create'
    );

    expect(issues).toEqual([
      {
        field: 'shortName',
        message: 'Short name must be 30 characters or less.',
      },
    ]);
  });

  it('skips undefined fields in update mode', () => {
    const issues = validateAppMetadata({}, 'update');
    expect(issues).toEqual([]);
  });

  it('rejects empty endpoint when explicitly provided in update mode', () => {
    const issues = validateAppMetadata({ endpoint: '   ' }, 'update');
    expect(issues).toEqual([
      {
        field: 'endpoint',
        message: 'Endpoint URL cannot be empty.',
      },
    ]);
  });

  it('reuses the same field validation for edit prompts', () => {
    expect(validateAppMetadataField('shortName', 'x'.repeat(31), 'manifest')).toBe(
      'Short name must be 30 characters or less.'
    );
    expect(validateAppMetadataField('websiteUrl', 'http://example.com', 'manifest')).toBe(
      'Website URL must start with https:// and include a domain.'
    );
  });

  it('validates manifest metadata through the shared adapter', () => {
    const issues = validateAppMetadata(
      appMetadataFromManifest({
        id: 'app-id',
        manifestVersion: '1.25',
        version: '1.0.0',
        name: { short: 'x'.repeat(31), full: 'Valid full name' },
        description: { short: 'Short description', full: 'Long description' },
        developer: {
          name: 'Developer',
          websiteUrl: 'https://example.com',
          privacyUrl: 'https://example.com/privacy',
          termsOfUseUrl: 'https://example.com/terms',
        },
      }),
      'manifest'
    );

    expect(issues[0]).toEqual({
      field: 'shortName',
      message: 'Short name must be 30 characters or less.',
    });
  });
});
