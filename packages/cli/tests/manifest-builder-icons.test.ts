// RED/GREEN: verified 2026-04-10
// RED (icons): removed "Icons" choice from checkbox in manifest-builder.ts — test failed
//      because checkbox choices did not include { value: "icons" }.
// GREEN (icons): restored "Icons" choice — test passes.
// RED (validDomains): removed "*.botframework.com" from manifest default — test failed.
// GREEN (validDomains): restored "*.botframework.com" — test passes.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdmZip from 'adm-zip';
import { createManifest, createManifestZip } from '../src/apps/manifest.js';
import type { BotScope } from '../src/apps/manifest.js';

vi.mock('../src/utils/interactive.js', () => ({
  isInteractive: () => true,
}));

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  input: vi.fn(),
}));

describe('collectManifestCustomization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('allows an empty full description and falls back to the short description', async () => {
    const { input } = await import('@inquirer/prompts');
    const mockedInput = vi.mocked(input);

    mockedInput
      .mockResolvedValueOnce('Handles projects for our team' as never)
      .mockResolvedValueOnce('' as never);

    const { collectManifestCustomization } = await import('../src/apps/manifest-builder.js');

    const result = await collectManifestCustomization(['description']);

    const fullDescriptionPrompt = mockedInput.mock.calls[1][0] as {
      validate: (value: string) => string | true;
    };
    expect(fullDescriptionPrompt.validate('')).toBe(true);
    expect(result.description).toEqual({
      short: 'Handles projects for our team',
      full: undefined,
    });
  });

  it('returns icon paths when icons are selected', async () => {
    const { input } = await import('@inquirer/prompts');
    const mockedInput = vi.mocked(input);

    mockedInput
      .mockResolvedValueOnce('./color.png' as never)
      .mockResolvedValueOnce('./outline.png' as never);

    const { collectManifestCustomization } = await import('../src/apps/manifest-builder.js');

    const result = await collectManifestCustomization(['icons']);

    expect(result.icons).toEqual({
      colorIconPath: './color.png',
      outlineIconPath: './outline.png',
    });
  });

  it('omits icons and does not prompt for paths when not selected', async () => {
    const { input } = await import('@inquirer/prompts');
    const mockedInput = vi.mocked(input);

    const { collectManifestCustomization } = await import('../src/apps/manifest-builder.js');

    const result = await collectManifestCustomization([]);

    expect(result.icons).toBeUndefined();
    expect(mockedInput).not.toHaveBeenCalled();
  });

  it('omits icons when both paths are empty', async () => {
    const { input } = await import('@inquirer/prompts');
    const mockedInput = vi.mocked(input);

    mockedInput.mockResolvedValueOnce('' as never).mockResolvedValueOnce('' as never);

    const { collectManifestCustomization } = await import('../src/apps/manifest-builder.js');

    const result = await collectManifestCustomization(['icons']);

    expect(result.icons).toBeUndefined();
  });

});

describe('createManifest manifest version', () => {
  it('uses the pinned version and matching schema without discovery', () => {
    const manifest = createManifest({
      botId: 'test-bot-id',
      botName: 'Test Bot',
    });

    expect(manifest).toMatchObject({
      manifestVersion: '1.30',
      $schema: 'https://developer.microsoft.com/json-schemas/teams/v1.30/MicrosoftTeams.schema.json',
      version: '1.0.0',
      bots: [{ botId: 'test-bot-id', scopes: ['personal', 'team', 'groupChat'] }],
    });
    expect(manifest).not.toHaveProperty('authorization');
  });

  it('includes the pinned version and schema URL in the generated app package', () => {
    const zip = new AdmZip(createManifestZip({
      botId: 'test-bot-id',
      botName: 'Test Bot',
    }));
    const manifest: unknown = JSON.parse(zip.readAsText('manifest.json'));

    expect(manifest).toMatchObject({
      manifestVersion: '1.30',
      $schema: 'https://developer.microsoft.com/json-schemas/teams/v1.30/MicrosoftTeams.schema.json',
    });
  });
});

describe('createManifest scope defaults', () => {
  const cases: Array<{ scopes: BotScope[] | undefined; hasPersonal: boolean }> = [
    { scopes: undefined, hasPersonal: true },
    { scopes: [], hasPersonal: true },
    { scopes: ['personal'], hasPersonal: true },
    { scopes: ['team'], hasPersonal: false },
    { scopes: ['groupChat'], hasPersonal: false },
    { scopes: ['team', 'groupChat'], hasPersonal: false },
    { scopes: ['copilot'], hasPersonal: true },
  ];

  it.each(cases)('matches TDP defaults for scopes $scopes', ({ scopes, hasPersonal }) => {
    const manifest = createManifest({
      botId: 'test-bot-id',
      botName: 'Test Bot',
      scopes,
    });

    if (hasPersonal) {
      expect(manifest).toHaveProperty('staticTabs', [
        { entityId: 'conversations', scopes: ['personal'] },
        { entityId: 'about', scopes: ['personal'] },
      ]);
    } else {
      expect(manifest).not.toHaveProperty('staticTabs');
    }
    expect(manifest).not.toHaveProperty('supportsChannelFeatures');
  });
});

describe('createManifest copilotAgents', () => {
  it('adds copilotAgents block when copilot scope is selected', () => {
    const manifest = createManifest({
      botId: 'test-bot-id',
      botName: 'Test Bot',
      scopes: ['personal', 'copilot'],
    }) as {
      bots: Array<{ scopes: string[] }>;
      copilotAgents: { customEngineAgents: Array<{ type: string; id: string }> };
    };

    expect(manifest.copilotAgents).toEqual({
      customEngineAgents: [{ type: 'bot', id: 'test-bot-id' }],
    });
    expect(manifest.bots[0].scopes).toContain('copilot');
    expect(manifest.bots[0].scopes).toContain('personal');
  });

  it('does not add copilotAgents block when copilot scope is not selected', () => {
    const manifest = createManifest({
      botId: 'test-bot-id',
      botName: 'Test Bot',
      scopes: ['personal', 'team'],
    }) as {
      copilotAgents?: { customEngineAgents: Array<{ type: string; id: string }> };
    };

    expect(manifest.copilotAgents).toBeUndefined();
  });

  it('auto-includes personal scope when copilot is selected without it', () => {
    const manifest = createManifest({
      botId: 'test-bot-id',
      botName: 'Test Bot',
      scopes: ['copilot'],
    }) as { bots: Array<{ scopes: string[] }> };

    expect(manifest.bots[0].scopes).toContain('personal');
    expect(manifest.bots[0].scopes).toContain('copilot');
  });
});

describe('buildScopeUpdates', () => {
  const baseApp = {
    teamsAppId: 'test-app-id',
    appId: 'test-app-id',
    shortName: 'Test',
    longName: '',
    shortDescription: '',
    longDescription: '',
    version: '1.0.0',
    developerName: '',
    websiteUrl: '',
    privacyUrl: '',
    termsOfUseUrl: '',
    manifestVersion: '1.25',
    webApplicationInfoId: '',
    mpnId: '',
    accentColor: '',
    bots: [{ botId: 'test-bot-id', scopes: ['personal', 'team'] }],
  };

  it('adds copilotAgents block when copilot scope is added', async () => {
    const { buildScopeUpdates } = await import('../src/commands/app/update.js');
    const updates = buildScopeUpdates(baseApp, ['personal', 'copilot']);
    expect(updates.copilotAgents).toEqual({
      customEngineAgents: [{ type: 'bot', id: 'test-bot-id' }],
    });
    expect(updates.bots?.[0]?.scopes).toContain('copilot');
    expect(updates.bots?.[0]?.scopes).toContain('personal');
  });

  it('removes copilotAgents block when copilot scope is removed', async () => {
    const { buildScopeUpdates } = await import('../src/commands/app/update.js');
    const updates = buildScopeUpdates(baseApp, ['personal', 'team']);
    expect(updates.copilotAgents).toBeUndefined();
  });

  it('auto-includes personal when copilot is selected without it', async () => {
    const { buildScopeUpdates } = await import('../src/commands/app/update.js');
    const updates = buildScopeUpdates(baseApp, ['copilot']);
    expect(updates.bots?.[0]?.scopes).toContain('personal');
    expect(updates.bots?.[0]?.scopes).toContain('copilot');
    expect(updates.staticTabs).toEqual([
      { entityId: 'conversations', scopes: ['personal'] },
      { entityId: 'about', scopes: ['personal'] },
    ]);
  });

  it('adds personal tabs when personal scope is enabled', async () => {
    const { buildScopeUpdates } = await import('../src/commands/app/update.js');
    const updates = buildScopeUpdates({
      ...baseApp,
      bots: [{ botId: 'test-bot-id', scopes: ['team'] }],
    }, ['personal', 'team']);

    expect(updates.staticTabs).toEqual([
      { entityId: 'conversations', scopes: ['personal'] },
      { entityId: 'about', scopes: ['personal'] },
    ]);
  });

  it('removes the conversation tab and an otherwise empty about tab when personal scope is disabled', async () => {
    const { buildScopeUpdates } = await import('../src/commands/app/update.js');
    const updates = buildScopeUpdates({
      ...baseApp,
      staticTabs: [
        { entityId: 'conversations', scopes: ['personal'] },
        { entityId: 'about', scopes: ['personal'] },
      ],
    }, ['team']);

    expect(updates.staticTabs).toEqual([]);
  });

  it('preserves custom tabs, their metadata, and the about tab when personal scope is disabled', async () => {
    const { buildScopeUpdates } = await import('../src/commands/app/update.js');
    const app = {
      ...baseApp,
      supportsChannelFeatures: 'tier1',
      staticTabs: [
        { entityId: 'conversations', scopes: ['personal'] },
        { entityId: 'custom', scopes: ['personal'], contentUrl: 'https://example.com/tab', objectId: 'custom-id' },
        { entityId: 'about', scopes: ['personal'], objectId: 'about-id' },
      ],
    };
    const original = structuredClone(app);
    const updates = buildScopeUpdates(app, ['groupChat']);

    expect(updates.staticTabs).toEqual(original.staticTabs.slice(1));
    expect(app).toEqual(original);
    expect({ ...app, ...updates }).toHaveProperty('supportsChannelFeatures', 'tier1');
  });

  it('inserts a missing conversation tab before the existing about tab without changing custom tabs', async () => {
    const { buildScopeUpdates } = await import('../src/commands/app/update.js');
    const customTab = { entityId: 'custom', scopes: ['personal'], contentUrl: 'https://example.com/tab' };
    const aboutTab = { entityId: 'about', scopes: ['personal'], objectId: 'about-id' };
    const updates = buildScopeUpdates({
      ...baseApp,
      staticTabs: [customTab, aboutTab],
    }, ['personal']);

    expect(updates.staticTabs).toEqual([
      customTab,
      { entityId: 'conversations', scopes: ['personal'] },
      aboutTab,
    ]);
  });

  it('preserves existing built-in tabs without duplicates', async () => {
    const { buildScopeUpdates } = await import('../src/commands/app/update.js');
    const staticTabs = [
      { entityId: 'conversations', scopes: ['personal'], objectId: 'chat-id' },
      { entityId: 'about', scopes: ['personal'], objectId: 'about-id' },
    ];
    const updates = buildScopeUpdates({ ...baseApp, staticTabs }, ['personal', 'team']);

    expect(updates.staticTabs).toEqual(staticTabs);
  });

  it('does not add a staticTabs property when personal scope is disabled and no tabs exist', async () => {
    const { buildScopeUpdates } = await import('../src/commands/app/update.js');
    const updates = buildScopeUpdates(baseApp, ['team']);

    expect(updates).not.toHaveProperty('staticTabs');
  });

  it('returns empty object when app has no bots', async () => {
    const { buildScopeUpdates } = await import('../src/commands/app/update.js');
    const noBotApp = { ...baseApp, bots: undefined };
    const updates = buildScopeUpdates(noBotApp, ['personal']);
    expect(updates).toEqual({});
  });
});

describe('createManifest validDomains', () => {
  it('includes *.botframework.com by default with no endpoint', () => {
    const manifest = createManifest({
      botId: 'test-bot-id',
      botName: 'Test Bot',
    }) as { validDomains: string[] };

    expect(manifest.validDomains).toContain('*.botframework.com');
  });

  it('includes *.botframework.com alongside endpoint domain', () => {
    const manifest = createManifest({
      botId: 'test-bot-id',
      botName: 'Test Bot',
      endpoint: 'https://mybot.azurewebsites.net/api/messages',
    }) as { validDomains: string[] };

    expect(manifest.validDomains).toContain('*.botframework.com');
    expect(manifest.validDomains).toContain('mybot.azurewebsites.net');
  });
});
