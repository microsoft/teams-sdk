import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mockUploadManifest = vi.fn().mockResolvedValue(undefined);

vi.mock('../src/apps/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/apps/index.js')>();
  return {
    ...actual,
    downloadAppPackage: vi.fn(),
    uploadManifest: mockUploadManifest,
  };
});

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../src/utils/spinner.js', () => ({
  createSilentSpinner: () => ({
    start: vi.fn().mockReturnThis(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../src/utils/interactive.js', () => ({
  isAutoConfirm: vi.fn().mockReturnValue(true),
}));

describe('manifest upload shared validation', () => {
  const files: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const file of files) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    files.length = 0;
  });

  it('rejects manifest short names over 30 characters before upload', async () => {
    const file = path.join(
      os.tmpdir(),
      `teams-cli-manifest-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );
    files.push(file);

    fs.writeFileSync(
      file,
      JSON.stringify({
        id: 'test-app-id',
        version: '1.0.0',
        manifestVersion: '1.25',
        name: { short: 'x'.repeat(31), full: 'Valid full name' },
        description: { short: 'Short description', full: 'Long description' },
        developer: {
          name: 'Developer',
          websiteUrl: 'https://example.com',
          privacyUrl: 'https://example.com/privacy',
          termsOfUseUrl: 'https://example.com/terms',
        },
      })
    );

    const { uploadManifestFromFile } = await import('../src/commands/app/manifest/actions.js');

    await expect(
      uploadManifestFromFile('token', 'teams-app-id', file, true)
    ).rejects.toThrow('Short name must be 30 characters or less.');
    expect(mockUploadManifest).not.toHaveBeenCalled();
  });

  it('allows interactive upload to proceed when metadata validation fails and auto-confirm is enabled', async () => {
    const file = path.join(
      os.tmpdir(),
      `teams-cli-manifest-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );
    files.push(file);

    fs.writeFileSync(
      file,
      JSON.stringify({
        id: 'test-app-id',
        version: '1.0.0',
        manifestVersion: '1.25',
        name: { short: 'Valid short name', full: 'Valid full name' },
        description: { short: 'Short description' },
        developer: {
          name: 'Developer',
          websiteUrl: 'https://example.com',
          privacyUrl: 'https://example.com/privacy',
          termsOfUseUrl: 'https://example.com/terms',
        },
      })
    );

    const { uploadManifestFromFile } = await import('../src/commands/app/manifest/actions.js');

    await expect(uploadManifestFromFile('token', 'teams-app-id', file, false)).resolves.toEqual({
      version: '1.0.0',
      versionBumped: false,
    });
    expect(mockUploadManifest).toHaveBeenCalledWith(
      'token',
      'teams-app-id',
      expect.stringContaining('"manifestVersion": "1.25"')
    );
  });
});
