import { TDP_HOST } from '../utils/tdp-host.js';

export function installLink(teamsAppId: string, tenantId: string): string {
  return `https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&appTenantId=${tenantId}`;
}

export function portalLink(teamsAppId: string): string {
  return `${TDP_HOST}/apps/${teamsAppId}`;
}
