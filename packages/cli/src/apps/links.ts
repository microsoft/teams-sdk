export function installLink(teamsAppId: string): string {
  return `https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true`;
}

export function portalLink(teamsAppId: string): string {
  return `https://dev.teams.microsoft.com/apps/${teamsAppId}`;
}
