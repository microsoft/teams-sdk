import { apiFetch } from '../utils/http.js';

const TDP_BASE_URL = 'https://dev.teams.microsoft.com/api';

export type BotLocation = 'tm' | 'azure';

/**
 * Detect whether a bot is Teams-managed (created via TDP)
 * or in Azure (user's subscription).
 *
 * Uses TDP's /botframework endpoint: 200 = Teams-managed, 404 = Azure.
 */
export async function getBotLocation(token: string, botId: string): Promise<BotLocation> {
  const response = await apiFetch(`${TDP_BASE_URL}/botframework/${botId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok) return 'tm';
  if (response.status === 404) return 'azure';

  throw new Error(`Failed to check bot location: ${response.status} ${response.statusText}`);
}
