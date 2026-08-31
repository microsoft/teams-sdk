import type { BotDetails } from './tdp.js';
import { createResourceCache } from '../utils/resource-cache.js';

/**
 * Cached outcome of `GET /botframework/{botId}`.
 *
 * A 200 means the bot is Teams-managed and we have its full details; a 404 means
 * the bot lives in Azure. Both `fetchBot` and `getBotLocation` hit the same URL,
 * so caching the outcome lets a single network round-trip serve both.
 */
export type BotResource =
  | { status: 'tm'; bot: BotDetails }
  | { status: 'azure' };

/**
 * Process-scoped, in-memory cache for bot reads, keyed by `botId`.
 * Refreshed by `updateBot`; invalidated by `deleteBot`/`registerBot`.
 */
const cache = createResourceCache<BotResource>();

export function getCachedBot(botId: string): BotResource | undefined {
  return cache.get(botId);
}

export function setCachedBot(botId: string, resource: BotResource): void {
  cache.set(botId, resource);
}

/**
 * Drop a single bot's cached read, or clear the whole cache when no id is given.
 */
export function invalidateBot(botId?: string): void {
  cache.invalidate(botId);
}
