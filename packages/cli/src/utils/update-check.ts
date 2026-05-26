import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import pc from 'picocolors';
import { paths } from '../auth/config.js';
import { isInteractive } from './interactive.js';
import { logger } from './logger.js';
import { fetchLatestVersion, getCurrentVersion, isNewerVersion } from './update-info.js';

const STATE_FILE = join(paths.cache, 'update-check.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
let alreadyChecked = false;

interface UpdateState {
  lastCheck: number;
  latestVersion?: string;
}

async function readState(): Promise<UpdateState | null> {
  try {
    const data = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeState(state: UpdateState): Promise<void> {
  try {
    await mkdir(paths.cache, { recursive: true });
    await writeFile(STATE_FILE, JSON.stringify(state));
  } catch {
    // Best-effort
  }
}

/**
 * Check for updates once daily and show a warning if a newer version is available.
 * Non-blocking — silently skips on any failure.
 */
export async function checkForUpdates(): Promise<void> {
  if (!isInteractive()) return;
  if (alreadyChecked) return;
  alreadyChecked = true;

  try {
    const state = await readState();
    const now = Date.now();

    if (state && now - state.lastCheck < CHECK_INTERVAL_MS) {
      // Already checked recently — show hint if we cached a newer version
      if (state.latestVersion) {
        showUpdateHint(state.latestVersion);
      }
      return;
    }

    const latestVersion = await fetchLatestVersion();
    const newState: UpdateState = { lastCheck: now };

    if (latestVersion && isNewerVersion(latestVersion)) {
      newState.latestVersion = latestVersion;
      showUpdateHint(latestVersion);
    }

    await writeState(newState);
  } catch {
    // Never block the CLI
  }
}

function showUpdateHint(latestVersion: string): void {
  const currentVersion = getCurrentVersion();
  if (!isNewerVersion(latestVersion, currentVersion)) return;

  logger.info(
    pc.yellow(`\nUpdate available: ${pc.dim(currentVersion)} → ${pc.bold(latestVersion)}`) +
      `  Run ${pc.cyan('teams self-update')} to update.\n`
  );
}
