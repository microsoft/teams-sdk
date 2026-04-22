export function installLink(teamsAppId: string, tenantId: string): string {
  return `https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&appTenantId=${tenantId}`;
}

export function portalLink(teamsAppId: string): string {
  return `https://dev.teams.microsoft.com/apps/${teamsAppId}`;
}
