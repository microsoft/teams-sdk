import pc from 'picocolors';
import type { UpdateAppDetailsResult } from './api.js';
import { logger } from '../utils/logger.js';

export function formatVersionBumpReinstallHint(
  previousVersion: string | undefined,
  version: string | undefined
): string {
  const versionChange = previousVersion && version ? `${previousVersion} → ${version}` : version;
  return versionChange
    ? `Version auto-bumped: ${versionChange} — reinstall may be needed`
    : 'Version auto-bumped — reinstall may be needed';
}

export function logVersionBumpReinstallHint(
  result: Pick<UpdateAppDetailsResult, 'versionBumped' | 'previousVersion' | 'version'> | undefined
): void {
  if (!result?.versionBumped) return;
  logger.info(pc.dim(formatVersionBumpReinstallHint(result.previousVersion, result.version)));
}
