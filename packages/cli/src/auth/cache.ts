import type { ICachePlugin, TokenCacheContext } from '@azure/msal-node';
import { paths } from './config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

const CACHE_FILE = 'msal-cache.json';

function isWSL(): boolean {
  try {
    return fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
  } catch {
    return false;
  }
}

/**
 * Simple file-based cache plugin for environments where msal-node-extensions
 * doesn't work reliably (WSL, headless Linux, containers).
 */
function createFileCachePlugin(cachePath: string): ICachePlugin {
  return {
    async beforeCacheAccess(cacheContext: TokenCacheContext): Promise<void> {
      try {
        if (fs.existsSync(cachePath)) {
          const data = fs.readFileSync(cachePath, 'utf8');
          cacheContext.tokenCache.deserialize(data);
        }
      } catch (error) {
        logger.debug(`Failed to read token cache: ${error instanceof Error ? error.message : error}`);
      }
    },
    async afterCacheAccess(cacheContext: TokenCacheContext): Promise<void> {
      if (cacheContext.cacheHasChanged) {
        try {
          fs.writeFileSync(cachePath, cacheContext.tokenCache.serialize());
        } catch (error) {
          logger.debug(`Failed to write token cache: ${error instanceof Error ? error.message : error}`);
        }
      }
    },
  };
}

export async function createCachePlugin(): Promise<ICachePlugin | undefined> {
  // Ensure config directory exists
  if (!fs.existsSync(paths.config)) {
    fs.mkdirSync(paths.config, { recursive: true });
  }

  const cachePath = path.join(paths.config, CACHE_FILE);

  // On WSL, msal-node-extensions' libsecret backend silently fails to persist
  // data across processes (D-Bus session is ephemeral). Use a simple file-based
  // cache plugin instead.
  if (isWSL()) {
    logger.debug('WSL detected, using file-based token cache.');
    return createFileCachePlugin(cachePath);
  }

  try {
    // Dynamic import to avoid crashing on Linux/WSL when libsecret is missing
    const { PersistenceCreator, PersistenceCachePlugin } = await import(
      '@azure/msal-node-extensions'
    );

    // Try encrypted storage first (libsecret on Linux, Keychain on macOS, DPAPI on Windows)
    try {
      const persistence = await PersistenceCreator.createPersistence({
        cachePath,
        dataProtectionScope: 'CurrentUser',
        serviceName: 'teams-cli',
        accountName: 'msal-cache',
        usePlaintextFileOnLinux: false,
      });
      return new PersistenceCachePlugin(persistence);
    } catch {
      // libsecret unavailable — fall back to plaintext file with a warning
      logger.warn(
        pc.yellow(
          'Warning: libsecret not found — token cache will be stored unencrypted.\n' +
            'Install it for secure storage: sudo apt install libsecret-1-dev'
        )
      );
      const persistence = await PersistenceCreator.createPersistence({
        cachePath,
        dataProtectionScope: 'CurrentUser',
        serviceName: 'teams-cli',
        accountName: 'msal-cache',
        usePlaintextFileOnLinux: true,
      });
      return new PersistenceCachePlugin(persistence);
    }
  } catch (error) {
    logger.debug(
      `Native credential storage unavailable, using in-memory cache: ${error instanceof Error ? error.message : error}`
    );
    return undefined;
  }
}
