import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import pc from 'picocolors';
import { paths } from '../auth/config.js';
import { isInteractive } from './interactive.js';
import { logger } from './logger.js';

const STATE_FILE = join(paths.cache, 'update-check.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
let alreadyChecked = false;
const REGISTRY_API = 'https://registry.npmjs.org/@microsoft/teams.cli/latest';

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

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(REGISTRY_API, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
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

    if (latestVersion && isNewer(latestVersion)) {
      newState.latestVersion = latestVersion;
      showUpdateHint(latestVersion);
    }

    await writeState(newState);
  } catch {
    // Never block the CLI
  }
}

function showUpdateHint(latestVersion: string): void {
  const require = createRequire(import.meta.url);
  const { version: currentVersion } = require('../../package.json');
  if (!isNewer(latestVersion, currentVersion)) return;

  logger.info(
    pc.yellow(`\nUpdate available: ${pc.dim(currentVersion)} → ${pc.bold(latestVersion)}`) +
      `  Run ${pc.cyan('teams self-update')} to update.\n`
  );
}

function isNewer(latest: string, current?: string): boolean {
  if (!current) {
    const require = createRequire(import.meta.url);
    current = require('../../package.json').version;
  }

  const parse = (v: string) => v.split('.').map(Number);
  const l = parse(latest);
  const c = parse(current!);

  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lp = l[i] ?? 0;
    const cp = c[i] ?? 0;
    if (lp > cp) return true;
    if (lp < cp) return false;
  }
  return false;
}
