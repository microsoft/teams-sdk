// RED/GREEN: schema validation for manifest update MVP.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const schema = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  additionalProperties: true,
  required: ['manifestVersion', 'version', 'id', 'developer', 'name', 'description', 'icons', 'accentColor'],
  properties: {
    manifestVersion: { type: 'string' },
    version: { type: 'string' },
    id: { type: 'string' },
    developer: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        websiteUrl: { type: 'string', format: 'uri' },
        privacyUrl: { type: 'string' },
        termsOfUseUrl: { type: 'string' },
      },
    },
    name: {
      type: 'object',
      properties: {
        short: { type: 'string', maxLength: 30 },
        full: { type: 'string' },
      },
    },
    description: {
      type: 'object',
      properties: {
        short: { type: 'string' },
        full: { type: 'string' },
      },
    },
    icons: { type: 'object' },
    accentColor: { type: 'string' },
  },
};

const mockApiFetch = vi.fn();

function tmpSchemaCacheDir(): string {
  return path.join(
    os.tmpdir(),
    `teams-cli-test-schema-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

vi.mock('../src/utils/http.js', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const validManifest = {
  manifestVersion: '1.25',
  version: '1.0.0',
  id: '00000000-0000-0000-0000-000000000000',
  developer: {
    name: 'Contoso',
    websiteUrl: 'https://example.com',
    privacyUrl: 'https://example.com/privacy',
    termsOfUseUrl: 'https://example.com/terms',
  },
  name: {
    short: 'Test App',
    full: 'Test App Full',
  },
  description: {
    short: 'Short description',
    full: 'Long description for the app',
  },
  icons: {
    color: 'color.png',
    outline: 'outline.png',
  },
  accentColor: '#FFFFFF',
};

describe('validateTeamsManifestSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => schema,
    });
  });

  it('fetches and caches schema, then accepts a valid manifest', async () => {
    const { validateTeamsManifestSchema, clearManifestSchemaValidationCache } = await import(
      '../src/apps/manifest-validation.js'
    );
    clearManifestSchemaValidationCache();

    const result = await validateTeamsManifestSchema(validManifest, {
      cacheDir: tmpSchemaCacheDir(),
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(mockApiFetch).toHaveBeenCalledOnce();
  });

  it('returns friendly paths for schema errors', async () => {
    const { validateTeamsManifestSchema, clearManifestSchemaValidationCache } = await import(
      '../src/apps/manifest-validation.js'
    );
    clearManifestSchemaValidationCache();

    const result = await validateTeamsManifestSchema(
      {
        ...validManifest,
        name: { short: 'x'.repeat(31), full: 'Test App Full' },
        developer: { ...validManifest.developer, websiteUrl: 'not-a-url' },
      },
      { cacheDir: tmpSchemaCacheDir() }
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'name.short', keyword: 'maxLength' }),
        expect.objectContaining({ path: 'developer.websiteUrl' }),
      ])
    );
  });

  it('uses cached schema without fetching again', async () => {
    const { validateTeamsManifestSchema, clearManifestSchemaValidationCache } = await import(
      '../src/apps/manifest-validation.js'
    );
    clearManifestSchemaValidationCache();
    const cacheDir = tmpSchemaCacheDir();

    await expect(validateTeamsManifestSchema(validManifest, { cacheDir })).resolves.toMatchObject({
      valid: true,
    });
    mockApiFetch.mockClear();
    await expect(validateTeamsManifestSchema(validManifest, { cacheDir })).resolves.toMatchObject({
      valid: true,
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('continues validation when writing the schema cache fails', async () => {
    const { validateTeamsManifestSchema, clearManifestSchemaValidationCache } = await import(
      '../src/apps/manifest-validation.js'
    );
    clearManifestSchemaValidationCache();
    const cacheFile = path.join(
      os.tmpdir(),
      `teams-cli-schema-cache-file-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    fs.writeFileSync(cacheFile, 'not a directory');

    try {
      await expect(validateTeamsManifestSchema(validManifest, { cacheDir: cacheFile })).resolves.toMatchObject({
        valid: true,
        issues: [],
      });
    } finally {
      if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile);
    }
  });

  it('reports schema fetch failures without throwing', async () => {
    const { validateTeamsManifestSchema, clearManifestSchemaValidationCache } = await import(
      '../src/apps/manifest-validation.js'
    );
    clearManifestSchemaValidationCache();
    mockApiFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

    const result = await validateTeamsManifestSchema(
      { ...validManifest, manifestVersion: '1.99' },
      { cacheDir: tmpSchemaCacheDir() }
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        path: '$schema',
        message: expect.stringContaining('Failed to fetch manifest schema'),
      })
    );
  });
});
