import { fetchAppDetailsV2, updateAppDetails } from '../../../apps/api.js';
import type { RscPermissionEntry, AppAuthorization } from '../../../apps/types.js';

/** Composite key for deduplication: "name|type" */
function permKey(p: RscPermissionEntry): string {
  return `${p.name}|${p.type}`;
}

export interface RscDiffResult {
  added: RscPermissionEntry[];
  removed: RscPermissionEntry[];
  unchanged: RscPermissionEntry[];
  final: RscPermissionEntry[];
}

/** Deduplicate entries by composite key, preserving first occurrence. */
function dedup(entries: RscPermissionEntry[]): RscPermissionEntry[] {
  const seen = new Set<string>();
  const result: RscPermissionEntry[] = [];
  for (const p of entries) {
    const key = permKey(p);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}

/**
 * Compute the diff between current and desired RSC permissions.
 * Deduplicates both sides by composite key before diffing.
 * Pure function — no API calls.
 */
export function diffRscPermissions(
  current: RscPermissionEntry[],
  desired: RscPermissionEntry[]
): RscDiffResult {
  const dedupedCurrent = dedup(current);
  const dedupedDesired = dedup(desired);

  const currentKeys = new Set(dedupedCurrent.map(permKey));
  const desiredKeys = new Set(dedupedDesired.map(permKey));

  const added = dedupedDesired.filter((p) => !currentKeys.has(permKey(p)));
  const removed = dedupedCurrent.filter((p) => !desiredKeys.has(permKey(p)));
  const unchanged = dedupedDesired.filter((p) => currentKeys.has(permKey(p)));

  return { added, removed, unchanged, final: dedupedDesired };
}

/**
 * Read current RSC permissions from the app.
 */
export async function listRscPermissions(
  token: string,
  teamsAppId: string
): Promise<RscPermissionEntry[]> {
  const details = await fetchAppDetailsV2(token, teamsAppId);
  return details.authorization?.permissions?.resourceSpecific ?? [];
}

/**
 * Build an authorization update that preserves sibling fields (e.g. orgWide)
 * while only replacing resourceSpecific.
 */
async function buildAuthorizationUpdate(
  token: string,
  teamsAppId: string,
  newResourceSpecific: RscPermissionEntry[]
): Promise<{ authorization: AppAuthorization; webApplicationInfoId?: string }> {
  const details = await fetchAppDetailsV2(token, teamsAppId);
  const currentAuth = details.authorization ?? {};
  const currentPerms = currentAuth.permissions ?? {};

  const update: { authorization: AppAuthorization; webApplicationInfoId?: string } = {
    authorization: {
      ...currentAuth,
      permissions: {
        ...currentPerms,
        resourceSpecific: newResourceSpecific,
      },
    },
  };

  // RSC permissions require webApplicationInfo.id in the manifest
  if (!details.webApplicationInfoId && newResourceSpecific.length > 0) {
    update.webApplicationInfoId = details.appId;
  }

  return update;
}

/**
 * Add RSC permissions to the app (merges with existing, skips duplicates).
 * Uses composite key (name+type) so the same permission name with different types are treated independently.
 */
export async function addRscPermissions(
  token: string,
  teamsAppId: string,
  permissions: RscPermissionEntry[]
): Promise<{ added: RscPermissionEntry[]; skipped: RscPermissionEntry[] }> {
  const current = await listRscPermissions(token, teamsAppId);
  const existingKeys = new Set(current.map(permKey));

  const added: RscPermissionEntry[] = [];
  const skipped: RscPermissionEntry[] = [];

  for (const perm of permissions) {
    if (existingKeys.has(permKey(perm))) {
      skipped.push(perm);
    } else {
      added.push(perm);
    }
  }

  if (added.length > 0) {
    const merged = [...current, ...added];
    const update = await buildAuthorizationUpdate(token, teamsAppId, merged);
    await updateAppDetails(token, teamsAppId, update);
  }

  return { added, skipped };
}

/**
 * Remove RSC permissions from the app by name.
 * Uses name-only matching (removes all types for that name).
 */
export async function removeRscPermissions(
  token: string,
  teamsAppId: string,
  permissionNames: string[]
): Promise<{ removed: string[]; notFound: string[] }> {
  const current = await listRscPermissions(token, teamsAppId);
  const currentNames = new Set(current.map((p) => p.name));

  const removed: string[] = [];
  const notFound: string[] = [];

  for (const name of permissionNames) {
    if (currentNames.has(name)) {
      removed.push(name);
    } else {
      notFound.push(name);
    }
  }

  if (removed.length > 0) {
    const removedSet = new Set(removed);
    const filtered = current.filter((p) => !removedSet.has(p.name));
    const update = await buildAuthorizationUpdate(token, teamsAppId, filtered);
    await updateAppDetails(token, teamsAppId, update);
  }

  return { removed, notFound };
}

/**
 * Set the exact RSC permissions for an app (atomic replace).
 * Used by the interactive scope editor to apply the diff in a single API call.
 */
export async function setRscPermissions(
  token: string,
  teamsAppId: string,
  permissions: RscPermissionEntry[]
): Promise<void> {
  const update = await buildAuthorizationUpdate(token, teamsAppId, permissions);
  await updateAppDetails(token, teamsAppId, update);
}
