// RED/GREEN: verified 2026-04-10
// RED (icons): removed "Icons" choice from checkbox in manifest-builder.ts — test failed
//      because checkbox choices did not include { value: "icons" }.
// GREEN (icons): restored "Icons" choice — test passes.
// RED (validDomains): removed "*.botframework.com" from manifest default — test failed.
// GREEN (validDomains): restored "*.botframework.com" — test passes.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createManifest } from '../src/apps/manifest.js';

vi.mock('../src/utils/interactive.js', () => ({
  isInteractive: () => true,
}));

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  input: vi.fn(),
}));

describe('collectManifestCustomization icons', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('offers Icons as a checkbox choice and returns icon paths when selected', async () => {
    const { checkbox, input } = await import('@inquirer/prompts');
    const mockedCheckbox = vi.mocked(checkbox);
    const mockedInput = vi.mocked(input);

    mockedCheckbox.mockResolvedValueOnce(['icons'] as never);
    mockedInput
      .mockResolvedValueOnce('./color.png' as never)
      .mockResolvedValueOnce('./outline.png' as never);

    const { collectManifestCustomization } = await import('../src/apps/manifest-builder.js');

    const result = await collectManifestCustomization();

    // Verify "Icons" is offered as a choice
    const checkboxCall = mockedCheckbox.mock.calls[0][0] as {
      choices: Array<{ name: string; value: string }>;
    };
    const iconChoice = checkboxCall.choices.find((c) => c.value === 'icons');
    expect(iconChoice).toBeDefined();
    expect(iconChoice!.name).toBe('Icons');

    // Verify icon paths are returned
    expect(result.icons).toEqual({
      colorIconPath: './color.png',
      outlineIconPath: './outline.png',
    });
  });

  it('omits icons and does not prompt for paths when not selected', async () => {
    const { checkbox, input } = await import('@inquirer/prompts');
    const mockedCheckbox = vi.mocked(checkbox);
    const mockedInput = vi.mocked(input);

    mockedCheckbox.mockResolvedValueOnce([] as never);

    const { collectManifestCustomization } = await import('../src/apps/manifest-builder.js');

    const result = await collectManifestCustomization();

    expect(result.icons).toBeUndefined();
    expect(mockedInput).not.toHaveBeenCalled();
  });

  it('omits icons when both paths are empty', async () => {
    const { checkbox, input } = await import('@inquirer/prompts');
    const mockedCheckbox = vi.mocked(checkbox);
    const mockedInput = vi.mocked(input);

    mockedCheckbox.mockResolvedValueOnce(['icons'] as never);
    mockedInput.mockResolvedValueOnce('' as never).mockResolvedValueOnce('' as never);

    const { collectManifestCustomization } = await import('../src/apps/manifest-builder.js');

    const result = await collectManifestCustomization();

    expect(result.icons).toBeUndefined();
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
