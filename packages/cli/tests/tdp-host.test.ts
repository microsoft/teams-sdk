import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadWithFlag(value: string | undefined) {
  if (value === undefined) delete process.env.TEAMS_DEV_API;
  else process.env.TEAMS_DEV_API = value;
  vi.resetModules();
  const host = await import('../src/utils/tdp-host.js');
  const auth = await import('../src/auth/config.js');
  const links = await import('../src/apps/links.js');
  return { host, auth, links };
}

describe('TDP host selection', () => {
  afterEach(() => {
    delete process.env.TEAMS_DEV_API;
    vi.resetModules();
  });

  it('defaults to prod', async () => {
    const { host, auth, links } = await loadWithFlag(undefined);

    expect(host.isDevApiEnabled()).toBe(false);
    expect(host.TDP_BASE_URL).toBe('https://dev.teams.microsoft.com/api');
    expect(host.BOT_COMMUNICATION_BASE_URL).toBeUndefined();
    expect(auth.teamsDevPortalScopes).toEqual([
      'https://dev.teams.microsoft.com/AppDefinitions.ReadWrite',
    ]);
    expect(links.portalLink('app-id')).toBe('https://dev.teams.microsoft.com/apps/app-id');
  });

  it('switches every TDP value to dev-int when TEAMS_DEV_API is set', async () => {
    const { host, auth, links } = await loadWithFlag('1');

    expect(host.isDevApiEnabled()).toBe(true);
    expect(host.TDP_BASE_URL).toBe('https://dev-int.teams.microsoft.com/api');
    expect(host.BOT_COMMUNICATION_BASE_URL).toBe(
      'https://dev-int.teams.microsoft.com/cosmictestamer'
    );
    expect(auth.teamsDevPortalScopes).toEqual([
      'https://dev-int.teams.microsoft.com/AppDefinitions.ReadWrite',
    ]);
    expect(links.portalLink('app-id')).toBe('https://dev-int.teams.microsoft.com/apps/app-id');
  });
});
