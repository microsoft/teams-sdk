import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppDetails } from '../src/apps/types.js';

// --- Mocks ---

const mockDetails: AppDetails = {
  teamsAppId: 'test-teams-app-id',
  appId: '00000000-0000-0000-0000-000000000001',
  shortName: 'Test App',
  longName: 'Test App',
  shortDescription: 'desc',
  longDescription: 'desc',
  version: '1.0.0',
  developerName: 'dev',
  websiteUrl: 'https://example.com',
  privacyUrl: 'https://example.com/privacy',
  termsOfUseUrl: 'https://example.com/terms',
  manifestVersion: '1.25',
  webApplicationInfoId: '',
  mpnId: '',
  accentColor: '#FFFFFF',
};

let postedBody: AppDetails | null = null;

vi.mock('../src/utils/http.js', () => ({
  apiFetch: vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      postedBody = JSON.parse(init.body as string);
      return { ok: true, json: async () => postedBody };
    }
    // GET — return current details
    return { ok: true, json: async () => structuredClone(mockDetails) };
  }),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn() },
}));

import { updateAppDetails } from '../src/apps/api.js';

describe('updateAppDetails version auto-bump', () => {
  beforeEach(() => {
    postedBody = null;
    mockDetails.version = '1.0.0';
    mockDetails.shortName = 'Test App';
    mockDetails.webApplicationInfoId = '';
  });

  it('bumps patch version when content changes', async () => {
    await updateAppDetails('token', 'test-teams-app-id', { shortName: 'New Name' });

    expect(postedBody).not.toBeNull();
    expect(postedBody!.version).toBe('1.0.1');
    expect(postedBody!.shortName).toBe('New Name');
  });

  it('does NOT bump when updates include explicit version', async () => {
    await updateAppDetails('token', 'test-teams-app-id', {
      shortName: 'New Name',
      version: '2.0.0',
    });

    expect(postedBody).not.toBeNull();
    expect(postedBody!.version).toBe('2.0.0');
  });

  it('does NOT bump when content is identical (no-op)', async () => {
    await updateAppDetails('token', 'test-teams-app-id', { shortName: 'Test App' });

    expect(postedBody).not.toBeNull();
    expect(postedBody!.version).toBe('1.0.0');
  });

  it('does NOT bump when autoBumpVersion is false', async () => {
    await updateAppDetails('token', 'test-teams-app-id', { shortName: 'New Name' }, { autoBumpVersion: false });

    expect(postedBody).not.toBeNull();
    expect(postedBody!.version).toBe('1.0.0');
  });

  it('handles unparseable version gracefully', async () => {
    mockDetails.version = 'not-a-version';

    await updateAppDetails('token', 'test-teams-app-id', { shortName: 'New Name' });

    expect(postedBody).not.toBeNull();
    expect(postedBody!.version).toBe('not-a-version');
  });

  it('bumps when webApplicationInfoId changes', async () => {
    await updateAppDetails('token', 'test-teams-app-id', {
      webApplicationInfoId: 'new-aad-app-id',
    });

    expect(postedBody).not.toBeNull();
    expect(postedBody!.version).toBe('1.0.1');
  });

  it('bumps two-part versions correctly', async () => {
    mockDetails.version = '1.0';

    await updateAppDetails('token', 'test-teams-app-id', { shortName: 'New Name' });

    expect(postedBody).not.toBeNull();
    expect(postedBody!.version).toBe('1.1');
  });
});
