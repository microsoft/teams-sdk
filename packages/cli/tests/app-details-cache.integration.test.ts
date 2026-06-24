import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import { getTokenSilent, teamsDevPortalScopes } from '../src/auth/index.js';
import { fetchApps, fetchAppDetailsV2 } from '../src/apps/api.js';
import { invalidateAppDetails } from '../src/apps/app-details-cache.js';

/**
 * Live timing/round-trip test for the app-details cache.
 *
 * Opt-in only: set RUN_INTEGRATION=1 and be logged into a Teams test account
 * (`teams login`). Optionally pin INTEGRATION_APP_ID to a specific app; otherwise
 * the first app returned by `fetchApps` is used. The test is read-only.
 */
const RUN = process.env.RUN_INTEGRATION === '1';
const describeIntegration = RUN ? describe : describe.skip;

const ITERATIONS = 5;

describeIntegration('app-details cache — live timing (RUN_INTEGRATION=1)', () => {
  let token: string | null = null;
  let appId: string | null = null;

  beforeAll(async () => {
    token = await getTokenSilent(teamsDevPortalScopes);
    if (!token) return;

    appId = process.env.INTEGRATION_APP_ID ?? null;
    if (!appId) {
      const apps = await fetchApps(token);
      appId = apps[0]?.teamsAppId ?? null;
    }
  }, 60000);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(
    'serves repeat reads from cache with a single network round-trip',
    async () => {
      if (!token || !appId) {
        console.warn('[integration] skipped: no token or no app available');
        return;
      }

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      // --- Cached run: first call hits the network, the rest hit memory. ---
      invalidateAppDetails();
      fetchSpy.mockClear();
      const cachedStart = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        await fetchAppDetailsV2(token, appId);
      }
      const cachedMs = performance.now() - cachedStart;
      const cachedNetworkCalls = fetchSpy.mock.calls.length;

      // --- Forced run: every call goes to the network. ---
      invalidateAppDetails();
      fetchSpy.mockClear();
      const forcedStart = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        await fetchAppDetailsV2(token, appId, { force: true });
      }
      const forcedMs = performance.now() - forcedStart;
      const forcedNetworkCalls = fetchSpy.mock.calls.length;

      console.log(
        `[integration] app ${appId} over ${ITERATIONS} reads\n` +
          `  cached: ${cachedNetworkCalls} network call(s), ${cachedMs.toFixed(1)}ms total\n` +
          `  forced: ${forcedNetworkCalls} network call(s), ${forcedMs.toFixed(1)}ms total\n` +
          `  saved : ${forcedNetworkCalls - cachedNetworkCalls} round-trip(s), ` +
          `${(forcedMs - cachedMs).toFixed(1)}ms`
      );

      // Primary assertions: network-call counts (deterministic).
      expect(cachedNetworkCalls).toBe(1);
      expect(forcedNetworkCalls).toBe(ITERATIONS);
      // Timing is informational/noisy; the cached run must not be slower overall.
      expect(cachedMs).toBeLessThanOrEqual(forcedMs);
    },
    60000
  );
});
