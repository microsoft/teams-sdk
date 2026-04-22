import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdmZip from 'adm-zip';

/**
 * Tests that uploadManifest uses zip import and preserves icons.
 * Mocks at the apiFetch level to avoid intra-module mock limitations.
 */

const MOCK_COLOR_ICON = Buffer.from('mock-color-icon-data');
const MOCK_OUTLINE_ICON = Buffer.from('mock-outline-icon-data');
const SERVER_MANIFEST = JSON.stringify({
  id: 'test-app-id',
  version: '1.0.0',
  manifestVersion: '1.16',
  name: { short: 'Test' },
});

function createMockPackage(): Buffer {
  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(SERVER_MANIFEST));
  zip.addFile('color.png', MOCK_COLOR_ICON);
  zip.addFile('outline.png', MOCK_OUTLINE_ICON);
  return zip.toBuffer();
}

let capturedImportBody: Uint8Array | null = null;
let mockDownloadFails = false;

vi.mock('../src/utils/http.js', () => ({
  apiFetch: vi.fn(async (url: string, init?: RequestInit) => {
    // Download app package endpoint
    if (typeof url === 'string' && url.includes('/manifest') && init?.method !== 'POST') {
      if (mockDownloadFails) {
        return { ok: false, status: 404, statusText: 'Not Found', text: async () => 'Not found' };
      }
      const zipBuffer = createMockPackage();
      const base64 = zipBuffer.toString('base64');
      return {
        ok: true,
        json: async () => base64,
      };
    }

    // Import endpoint
    if (typeof url === 'string' && url.includes('/import')) {
      capturedImportBody = init?.body as Uint8Array;
      return {
        ok: true,
        json: async () => ({ teamsAppId: 'test-app-id' }),
      };
    }

    return { ok: true, json: async () => ({}) };
  }),
}));

vi.mock('../src/project/paths.js', () => ({
  staticsDir: '/mock/statics',
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  const { join } = await import('node:path');
  const mockStaticsDir = '/mock/statics';
  const mockColorPath = join(mockStaticsDir, 'color.png');
  const mockOutlinePath = join(mockStaticsDir, 'outline.png');
  const mockedReadFileSync = vi.fn((...args: Parameters<typeof actual.readFileSync>) => {
    const filePath = args[0];
    if (typeof filePath === 'string' && (filePath === mockColorPath || filePath === mockOutlinePath)) {
      return Buffer.from('default-icon');
    }
    return actual.readFileSync(...args);
  });
  return {
    ...actual,
    default: { ...actual.default, readFileSync: mockedReadFileSync },
    readFileSync: mockedReadFileSync,
  };
});

const { uploadManifest } = await import('../src/apps/api.js');

describe('uploadManifest (zip import)', () => {
  beforeEach(() => {
    capturedImportBody = null;
    mockDownloadFails = false;
  });

  it('calls the import endpoint with overwrite flag', async () => {
    const { apiFetch } = await import('../src/utils/http.js');
    const newManifest = JSON.stringify({ id: 'test', version: '1.0.1' });
    await uploadManifest('token', 'test-app-id', newManifest);

    const importCall = vi.mocked(apiFetch).mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('/import')
    );
    expect(importCall).toBeDefined();
    expect(importCall![0]).toContain('overwriteIfAppAlreadyExists=true');
  });

  it('preserves existing icons from the downloaded package', async () => {
    const newManifest = JSON.stringify({ id: 'test', version: '1.0.1' });
    await uploadManifest('token', 'test-app-id', newManifest);

    expect(capturedImportBody).not.toBeNull();
    const zip = new AdmZip(Buffer.from(capturedImportBody!));

    const colorEntry = zip.getEntry('color.png');
    expect(colorEntry).toBeDefined();
    expect(colorEntry!.getData().toString()).toBe(MOCK_COLOR_ICON.toString());

    const outlineEntry = zip.getEntry('outline.png');
    expect(outlineEntry).toBeDefined();
    expect(outlineEntry!.getData().toString()).toBe(MOCK_OUTLINE_ICON.toString());
  });

  it('replaces manifest.json with the new content', async () => {
    const newManifest = JSON.stringify({ id: 'updated', version: '2.0.0' });
    await uploadManifest('token', 'test-app-id', newManifest);

    const zip = new AdmZip(Buffer.from(capturedImportBody!));
    const manifestEntry = zip.getEntry('manifest.json');
    expect(manifestEntry).toBeDefined();
    expect(manifestEntry!.getData().toString()).toBe(newManifest);
  });

  it('has exactly one manifest.json entry', async () => {
    const newManifest = JSON.stringify({ id: 'new-only', version: '1.0.0' });
    await uploadManifest('token', 'test-app-id', newManifest);

    const zip = new AdmZip(Buffer.from(capturedImportBody!));
    const entries = zip.getEntries().filter((e) => e.entryName === 'manifest.json');
    expect(entries).toHaveLength(1);
  });

  it('creates default zip when no existing package exists', async () => {
    mockDownloadFails = true;
    const newManifest = JSON.stringify({ id: 'first-upload', version: '1.0.0' });
    await uploadManifest('token', 'test-app-id', newManifest);

    expect(capturedImportBody).not.toBeNull();
    const zip = new AdmZip(Buffer.from(capturedImportBody!));
    expect(zip.getEntry('manifest.json')).toBeDefined();
    expect(zip.getEntry('color.png')).toBeDefined();
    expect(zip.getEntry('outline.png')).toBeDefined();

    // Default icons, not the mock package icons
    expect(zip.getEntry('color.png')!.getData().toString()).toBe('default-icon');
  });
});
