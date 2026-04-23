// RED/GREEN: verified 2026-04-10 — removed the webApplicationInfoId auto-set
// from buildAuthorizationUpdate and confirmed both "sets webApplicationInfoId"
// tests failed. Restored code and confirmed they pass.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppDetails, RscPermissionEntry } from '../src/apps/types.js';

/**
 * Tests that RSC write operations auto-set webApplicationInfoId when missing.
 * The manifest requires webApplicationInfo.id whenever RSC permissions exist.
 */

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
  authorization: { permissions: { resourceSpecific: [] } },
};

let capturedUpdate: Partial<AppDetails> | null = null;

vi.mock('../src/apps/api.js', () => ({
  fetchAppDetailsV2: vi.fn(async () => structuredClone(mockDetails)),
  updateAppDetails: vi.fn(async (_token: string, _id: string, update: Partial<AppDetails>) => {
    capturedUpdate = update;
    return { ...mockDetails, ...update };
  }),
}));

import {
  addRscPermissions,
  setRscPermissions,
  removeRscPermissions,
} from '../src/commands/app/rsc/actions.js';

describe('RSC webApplicationInfoId auto-set', () => {
  beforeEach(() => {
    capturedUpdate = null;
    // Reset to empty webApplicationInfoId
    mockDetails.webApplicationInfoId = '';
    mockDetails.authorization = { permissions: { resourceSpecific: [] } };
  });

  it('sets webApplicationInfoId to appId when adding RSC permissions and it is empty', async () => {
    const perms: RscPermissionEntry[] = [
      { name: 'ChannelMessage.Read.Group', type: 'Application' },
    ];

    await addRscPermissions('fake-token', 'test-teams-app-id', perms);

    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate!.webApplicationInfoId).toBe(mockDetails.appId);
  });

  it('sets webApplicationInfoId to appId when calling setRscPermissions and it is empty', async () => {
    const perms: RscPermissionEntry[] = [
      { name: 'TeamSettings.ReadWrite.Group', type: 'Application' },
    ];

    await setRscPermissions('fake-token', 'test-teams-app-id', perms);

    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate!.webApplicationInfoId).toBe(mockDetails.appId);
  });

  it('does NOT overwrite webApplicationInfoId when it is already set', async () => {
    mockDetails.webApplicationInfoId = 'existing-aad-app-id';

    const perms: RscPermissionEntry[] = [
      { name: 'ChannelMessage.Read.Group', type: 'Application' },
    ];

    await addRscPermissions('fake-token', 'test-teams-app-id', perms);

    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate!.webApplicationInfoId).toBeUndefined();
  });

  it('does NOT set webApplicationInfoId when removing all RSC permissions', async () => {
    mockDetails.authorization = {
      permissions: {
        resourceSpecific: [{ name: 'ChannelMessage.Read.Group', type: 'Application' }],
      },
    };

    await removeRscPermissions('fake-token', 'test-teams-app-id', ['ChannelMessage.Read.Group']);

    expect(capturedUpdate).not.toBeNull();
    // After removing the only permission, resourceSpecific is empty — no need to set webApplicationInfoId
    expect(capturedUpdate!.webApplicationInfoId).toBeUndefined();
  });
});
