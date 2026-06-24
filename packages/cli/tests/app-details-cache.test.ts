import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppDetails } from '../src/apps/types.js';

// --- Mock state ---

const baseDetails: AppDetails = {
  teamsAppId: 'app-1',
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

// Server-side current state, mutated by POSTs so reads reflect writes.
let serverState: AppDetails = structuredClone(baseDetails);
let getCount = 0;
let postCount = 0;

vi.mock('../src/utils/http.js', () => ({
  apiFetch: vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      postCount++;
      serverState = { ...serverState, ...(JSON.parse(init.body as string) as AppDetails) };
      return { ok: true, json: async () => structuredClone(serverState) };
    }
    getCount++;
    return { ok: true, json: async () => structuredClone(serverState) };
  }),
}));

import { fetchAppDetailsV2, updateAppDetails } from '../src/apps/api.js';
import { invalidateAppDetails } from '../src/apps/app-details-cache.js';

describe('app details in-memory cache', () => {
  beforeEach(() => {
    serverState = structuredClone(baseDetails);
    getCount = 0;
    postCount = 0;
    invalidateAppDetails();
  });

  it('serves a second read for the same id from cache (one network GET)', async () => {
    const first = await fetchAppDetailsV2('token', 'app-1');
    const second = await fetchAppDetailsV2('token', 'app-1');

    expect(first.teamsAppId).toBe('app-1');
    expect(second.shortName).toBe('Test App');
    expect(getCount).toBe(1);
  });

  it('bypasses the cache when force is set', async () => {
    await fetchAppDetailsV2('token', 'app-1');
    await fetchAppDetailsV2('token', 'app-1', { force: true });

    expect(getCount).toBe(2);
  });

  it('refreshes the cache from an update so later reads need no extra GET', async () => {
    // Prime the cache.
    await fetchAppDetailsV2('token', 'app-1');
    expect(getCount).toBe(1);

    // updateAppDetails does its own read-modify-write internally.
    await updateAppDetails('token', 'app-1', { shortName: 'Renamed' }, { autoBumpVersion: false });

    const after = await fetchAppDetailsV2('token', 'app-1');
    expect(after.shortName).toBe('Renamed');
    // No GET beyond the initial prime: the update wrote the fresh object into the cache.
    expect(getCount).toBe(1);
  });

  it('re-fetches after invalidateAppDetails(id)', async () => {
    await fetchAppDetailsV2('token', 'app-1');
    invalidateAppDetails('app-1');
    await fetchAppDetailsV2('token', 'app-1');

    expect(getCount).toBe(2);
  });

  it('does not let callers corrupt the cached object (clone safety)', async () => {
    const first = await fetchAppDetailsV2('token', 'app-1');
    first.shortName = 'Mutated';
    (first.bots ??= []).push({ botId: 'x' } as never);

    const second = await fetchAppDetailsV2('token', 'app-1');
    expect(second.shortName).toBe('Test App');
    expect(second.bots ?? []).toHaveLength(0);
    expect(getCount).toBe(1);
  });
});
