import type { AppDetails } from './types.js';
import { createResourceCache } from '../utils/resource-cache.js';

/**
 * Process-scoped, in-memory cache for full app-detail reads
 * (`GET /appdefinitions/v2/{id}` via `fetchAppDetailsV2`).
 *
 * The CLI runs as a fresh process per invocation, so this cache lives only for
 * the lifetime of a single command — there is no cross-process staleness risk
 * and no need for a TTL. Writes that return the authoritative object
 * (`updateAppDetails`) refresh the cache; writes that bypass `updateAppDetails`
 * (e.g. manifest/package imports) call {@link invalidateAppDetails}.
 */
const cache = createResourceCache<AppDetails>();

export function getCachedAppDetails(teamsAppId: string): AppDetails | undefined {
  return cache.get(teamsAppId);
}

export function setCachedAppDetails(teamsAppId: string, details: AppDetails): void {
  cache.set(teamsAppId, details);
}

/**
 * Drop a single app's cached details, or clear the whole cache when no id is given.
 */
export function invalidateAppDetails(teamsAppId?: string): void {
  cache.invalidate(teamsAppId);
}
