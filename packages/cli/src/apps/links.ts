import { TDP_HOST } from '../utils/tdp-host.js';

export function installLink(teamsAppId: string, tenantId: string): string {
  return `https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&appTenantId=${tenantId}`;
}

export function portalLink(teamsAppId: string): string {
  return `${TDP_HOST}/apps/${teamsAppId}`;
}

/**
 * Deep link that opens a 1:1 chat with an agentic user in Teams, keyed by
 * their UPN. Requires the agentic user to have a Teams-capable license
 * assigned -- without one, Teams won't be able to resolve the chat.
 */
export function agentChatLink(userPrincipalName: string): string {
  return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(userPrincipalName)}`;
}
