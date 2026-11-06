import { describe, expect, it } from 'vitest';
import { TDP_HOST, TDP_BASE_URL, TDP_V2_BASE_URL } from '../src/utils/tdp-host.js';
import { teamsDevPortalScopes } from '../src/auth/config.js';
import { installLink, portalLink } from '../src/apps/links.js';

describe('production TDP routing', () => {
  it('uses production for legacy and v2 APIs', () => {
    expect(TDP_HOST).toBe('https://dev.teams.microsoft.com');
    expect(TDP_BASE_URL).toBe('https://dev.teams.microsoft.com/api');
    expect(TDP_V2_BASE_URL).toBe('https://dev.teams.microsoft.com/cosmicprodamer');
  });

  it('requests the production token scope', () => {
    expect(teamsDevPortalScopes).toEqual([
      'https://dev.teams.microsoft.com/AppDefinitions.ReadWrite',
    ]);
  });

  it('links to the production portal and Teams install flow', () => {
    expect(portalLink('app-id')).toBe('https://dev.teams.microsoft.com/apps/app-id');
    expect(installLink('app-id', 'tenant-id')).toBe(
      'https://teams.microsoft.com/l/app/app-id?installAppPackage=true&appTenantId=tenant-id'
    );
  });
});
