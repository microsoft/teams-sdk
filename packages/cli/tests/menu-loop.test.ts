import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Command } from 'commander';

/**
 * Tests that interactive menu commands loop back to their menu after a
 * subcommand completes, instead of exiting (which would throw the user
 * back to the parent menu).
 *
 * Strategy: mock `select` to return an action on the first call, then
 * "back" on the second call. If the menu loops correctly, `select` is
 * called twice. If it doesn't loop, `select` is called only once.
 */

// ── Shared mocks (applied before each module reset) ────────────────────

function setupMocks(): void {
  vi.mock('@inquirer/prompts', () => ({
    select: vi.fn(),
    input: vi.fn(),
    confirm: vi.fn(),
    search: vi.fn(),
    checkbox: vi.fn(),
  }));

  vi.mock('../src/utils/interactive.js', () => ({
    isInteractive: () => true,
    isAutoConfirm: () => false,
    setAutoConfirm: vi.fn(),
    confirmAction: vi.fn().mockResolvedValue(true),
  }));

  vi.mock('../src/utils/spinner.js', () => ({
    createSilentSpinner: () => ({
      start: vi.fn().mockReturnThis(),
      stop: vi.fn(),
    }),
  }));

  vi.mock('../src/utils/logger.js', () => ({
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  }));

  vi.mock('../src/utils/az.js', () => ({
    runAz: vi.fn().mockResolvedValue([]),
    ensureAz: vi.fn(),
  }));

  vi.mock('../src/project/scaffold.js', () => ({
    listTemplates: vi.fn().mockReturnValue(['echo', 'ai', 'graph', 'mcp', 'mcpclient', 'tab']),
    listToolkits: vi.fn().mockReturnValue(['basic', 'oauth', 'embed']),
    scaffoldProject: vi.fn().mockResolvedValue(undefined),
    addToolkitConfig: vi.fn().mockResolvedValue(undefined),
    removeToolkitConfig: vi.fn().mockResolvedValue(undefined),
    detectLanguage: vi.fn().mockReturnValue('typescript'),
  }));
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('manifest menu loop', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupMocks();

    vi.mock('../src/utils/app-picker.js', () => ({
      pickApp: vi.fn().mockResolvedValue({
        app: { appId: 'test-app-id', teamsAppId: 'test-teams-app-id' },
        token: 'test-token',
      }),
    }));

    vi.mock('../src/apps/index.js', () => ({
      fetchApp: vi.fn().mockResolvedValue({
        appId: 'test-app-id',
        appName: 'Test App',
      }),
    }));

    vi.mock('../src/commands/app/manifest/actions.js', () => ({
      downloadManifest: vi.fn().mockResolvedValue(undefined),
      uploadManifestFromFile: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it('loops back to menu after selecting Download', async () => {
    const { select, input } = await import('@inquirer/prompts');
    const mockedSelect = vi.mocked(select);
    const mockedInput = vi.mocked(input);

    mockedSelect.mockResolvedValueOnce('download' as never).mockResolvedValueOnce('back' as never);
    mockedInput.mockResolvedValueOnce('' as never);

    const { appManifestCommand } = await import('../src/commands/app/manifest/index.js');

    await appManifestCommand.parseAsync([], { from: 'user' });

    expect(mockedSelect).toHaveBeenCalledTimes(2);
  });

  it('loops back to menu after selecting Upload', async () => {
    const { select, input } = await import('@inquirer/prompts');
    const mockedSelect = vi.mocked(select);
    const mockedInput = vi.mocked(input);

    mockedSelect.mockResolvedValueOnce('upload' as never).mockResolvedValueOnce('back' as never);
    mockedInput.mockResolvedValueOnce('./manifest.json' as never);

    const { appManifestCommand } = await import('../src/commands/app/manifest/index.js');

    await appManifestCommand.parseAsync([], { from: 'user' });

    expect(mockedSelect).toHaveBeenCalledTimes(2);
  });

  it('exits immediately when Back is selected', async () => {
    const { select } = await import('@inquirer/prompts');
    const mockedSelect = vi.mocked(select);
    mockedSelect.mockResolvedValueOnce('back' as never);

    const { appManifestCommand } = await import('../src/commands/app/manifest/index.js');

    await appManifestCommand.parseAsync([], { from: 'user' });

    expect(mockedSelect).toHaveBeenCalledTimes(1);
  });
});

describe('project menu loop', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupMocks();
  });

  it('exits after selecting New (project creation exits CLI)', async () => {
    const { select } = await import('@inquirer/prompts');
    const mockedSelect = vi.mocked(select);
    mockedSelect.mockResolvedValueOnce('new' as never);

    const { projectCommand } = await import('../src/commands/project/index.js');

    const newParseSpy = vi.fn().mockResolvedValue(undefined);
    const newSub = projectCommand.commands.find((c: Command) => c.name() === 'new');
    if (newSub) newSub.parseAsync = newParseSpy;

    await projectCommand.parseAsync([], { from: 'user' });

    expect(mockedSelect).toHaveBeenCalledTimes(1);
    expect(newParseSpy).toHaveBeenCalledTimes(1);
  });

  it('exits immediately when Back is selected', async () => {
    const { select } = await import('@inquirer/prompts');
    const mockedSelect = vi.mocked(select);
    mockedSelect.mockResolvedValueOnce('back' as never);

    const { projectCommand } = await import('../src/commands/project/index.js');

    await projectCommand.parseAsync([], { from: 'user' });

    expect(mockedSelect).toHaveBeenCalledTimes(1);
  });
});

describe('project new menu loop', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupMocks();
  });

  it('loops back to menu after creating a project', async () => {
    const { select, input } = await import('@inquirer/prompts');
    const mockedSelect = vi.mocked(select);
    const mockedInput = vi.mocked(input);

    mockedSelect
      .mockResolvedValueOnce('typescript' as never)
      .mockResolvedValueOnce('back' as never);
    mockedInput.mockResolvedValueOnce('test-app' as never);

    const { projectNewCommand } = await import('../src/commands/project/new/index.js');

    // Stub the TS subcommand to avoid actually scaffolding
    const tsSub = projectNewCommand.commands.find((c: Command) => c.name() === 'typescript');
    if (tsSub) tsSub.parseAsync = vi.fn().mockResolvedValue(undefined);

    await projectNewCommand.parseAsync([], { from: 'user' });

    expect(mockedSelect).toHaveBeenCalledTimes(2);
  });

  it('exits immediately when Back is selected', async () => {
    const { select } = await import('@inquirer/prompts');
    const mockedSelect = vi.mocked(select);
    mockedSelect.mockResolvedValueOnce('back' as never);

    const { projectNewCommand } = await import('../src/commands/project/new/index.js');

    await projectNewCommand.parseAsync([], { from: 'user' });

    expect(mockedSelect).toHaveBeenCalledTimes(1);
  });
});

describe('config menu includes set-lang', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupMocks();
  });

  it('loops back to menu after selecting set-lang', async () => {
    const { select } = await import('@inquirer/prompts');
    const mockedSelect = vi.mocked(select);
    mockedSelect.mockResolvedValueOnce('set-lang' as never).mockResolvedValueOnce('back' as never);

    const { configCommand } = await import('../src/commands/config/index.js');

    const setLangSub = configCommand.commands.find((c: Command) => c.name() === 'set-lang');
    if (setLangSub) setLangSub.parseAsync = vi.fn().mockResolvedValue(undefined);

    await configCommand.parseAsync([], { from: 'user' });

    expect(mockedSelect).toHaveBeenCalledTimes(2);
  });
});
