import { readBotResource } from './tdp.js';

export type BotLocation = 'tm' | 'azure';

/**
 * Detect whether a bot is Teams-managed (created via TDP)
 * or in Azure (user's subscription).
 *
 * Uses TDP's /botframework endpoint: 200 = Teams-managed, 404 = Azure.
 * Delegates to the shared `readBotResource` reader, so the lookup is cached and
 * shares a single network round-trip with `fetchBot`.
 */
export async function getBotLocation(token: string, botId: string): Promise<BotLocation> {
  const resource = await readBotResource(token, botId);
  return resource.status;
}
