// RED/GREEN: manifest schema fetching must be restricted to Microsoft-owned schema hosts.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';

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
  $schema: 'https://evil.example/schema.json',
  manifestVersion: '1.25',
  version: '1.0.0',
  id: '00000000-0000-0000-0000-000000000000',
  developer: {
    name: 'Contoso',
    websiteUrl: 'https://example.com',
    privacyUrl: 'https://example.com/privacy',
    termsOfUseUrl: 'https://example.com/terms',
  },
  name: { short: 'Test App', full: 'Test App Full' },
  description: { short: 'Short description', full: 'Long description for the app' },
  icons: { color: 'color.png', outline: 'outline.png' },
  accentColor: '#FFFFFF',
};

describe('manifest schema URL security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-Microsoft $schema URLs without fetching them', async () => {
    const { validateTeamsManifestSchema, clearManifestSchemaValidationCache } = await import(
      '../src/apps/manifest-validation.js'
    );
    clearManifestSchemaValidationCache();

    const result = await validateTeamsManifestSchema(validManifest, {
      cacheDir: tmpSchemaCacheDir(),
    });

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        path: '$schema',
        message: expect.stringContaining('Microsoft'),
      })
    );
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
