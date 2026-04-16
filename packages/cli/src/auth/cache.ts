import type { ICachePlugin } from '@azure/msal-node';
import { paths } from './config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

const CACHE_FILE = 'msal-cache.json';

export async function createCachePlugin(): Promise<ICachePlugin | undefined> {
  // Ensure config directory exists
  if (!fs.existsSync(paths.config)) {
    fs.mkdirSync(paths.config, { recursive: true });
  }

  const cachePath = path.join(paths.config, CACHE_FILE);

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
