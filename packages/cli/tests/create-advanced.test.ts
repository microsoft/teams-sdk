import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/utils/interactive.js', () => ({
  isInteractive: () => true,
}));

const mockCollectManifestCustomization = vi.fn();
vi.mock('../src/apps/index.js', () => ({
  collectManifestCustomization: mockCollectManifestCustomization,
  MANIFEST_CUSTOMIZATION_CHOICES: [
    { name: 'Description', value: 'description' },
    { name: 'Icons', value: 'icons' },
    { name: 'Scopes', value: 'scopes' },
    { name: 'Developer details', value: 'developer' },
  ],
  isManifestCustomizationField: (value: string) =>
    ['description', 'icons', 'scopes', 'developer'].includes(value),
}));

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  select: vi.fn(),
}));

describe('collectCreateAdvancedOptions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockCollectManifestCustomization.mockResolvedValue({});
  });

  it('collects manifest options separately from app registration options', async () => {
    const { checkbox, select } = await import('@inquirer/prompts');
    const mockedCheckbox = vi.mocked(checkbox);
    const mockedSelect = vi.mocked(select);

    mockedCheckbox.mockResolvedValueOnce(['scopes', 'appRegistration'] as never);
    mockedSelect.mockResolvedValueOnce('myOrg' as never);
    mockCollectManifestCustomization.mockResolvedValue({
      scopes: ['personal'],
    });

    const { collectCreateAdvancedOptions } = await import('../src/commands/app/create-advanced.js');

    const result = await collectCreateAdvancedOptions();

    const advancedPrompt = mockedCheckbox.mock.calls[0][0] as {
      message: string;
      choices: Array<{ name: string; value: string }>;
    };
    expect(advancedPrompt.message).toBe('Advanced options? (space to select, enter to continue)');
    expect(advancedPrompt.choices).toEqual([
      { name: 'Description', value: 'description' },
      { name: 'Icons', value: 'icons' },
      { name: 'Scopes', value: 'scopes' },
      { name: 'Developer details', value: 'developer' },
      { name: 'App registration', value: 'appRegistration' },
    ]);
    expect(mockCollectManifestCustomization).toHaveBeenCalledWith(['scopes']);

    const audiencePrompt = mockedSelect.mock.calls[0][0] as {
      message: string;
      choices: Array<{ name: string; value: string }>;
    };
    expect(audiencePrompt.message).toBe('Audience:');
    expect(audiencePrompt.choices).toEqual([
      { name: 'Multiple organizations', value: 'multipleOrgs' },
      { name: 'My organization only', value: 'myOrg' },
    ]);

    expect(result).toEqual({
      manifest: { scopes: ['personal'] },
      appRegistration: { signInAudience: 'myOrg' },
    });
  });
});
