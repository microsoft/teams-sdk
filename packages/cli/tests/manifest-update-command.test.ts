// RED/GREEN: full command behavior for manifest update MVP.

import AdmZip from 'adm-zip';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfirm = vi.fn();
const mockDownloadAppPackage = vi.fn();
const mockUploadManifest = vi.fn();
const mockValidateTeamsManifestSchema = vi.fn();
const mockIsAutoConfirm = vi.fn();
const mockIsInteractive = vi.fn();
const mockOutputJson = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerWarn = vi.fn();

vi.mock('@inquirer/prompts', () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

vi.mock('../src/apps/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/apps/api.js')>();
  return {
    ...actual,
    downloadAppPackage: (...args: unknown[]) => mockDownloadAppPackage(...args),
    uploadManifest: (...args: unknown[]) => mockUploadManifest(...args),
    uploadManifestFromPackage: (...args: unknown[]) => mockUploadManifest(...args),
  };
});

vi.mock('../src/apps/manifest-validation.js', () => ({
  validateTeamsManifestSchema: (...args: unknown[]) => mockValidateTeamsManifestSchema(...args),
  formatManifestValidationIssues: () => '  name.short: invalid',
}));

vi.mock('../src/auth/index.js', () => ({
  getAccount: vi.fn().mockResolvedValue({ tenantId: 'test-tenant' }),
  getTokenSilent: vi.fn().mockResolvedValue('fake-token'),
  teamsDevPortalScopes: ['https://dev.teams.microsoft.com/.default'],
}));

vi.mock('../src/utils/interactive.js', () => ({
  isAutoConfirm: () => mockIsAutoConfirm(),
  isInteractive: () => mockIsInteractive(),
}));

vi.mock('../src/utils/json-output.js', () => ({
  outputJson: (data: unknown) => mockOutputJson(data),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../src/utils/spinner.js', () => ({
  createSilentSpinner: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

function createPackage(manifest: Record<string, unknown>): Buffer {
  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)));
  zip.addFile('color.png', Buffer.from('color'));
  zip.addFile('outline.png', Buffer.from('outline'));
  return zip.toBuffer();
}

function createManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    manifestVersion: '1.25',
    version: '1.0.0',
    id: 'test-app-id',
    name: { short: 'Old', full: 'Old' },
    description: { short: 'Short', full: 'Long' },
    developer: {
      name: 'Developer',
      websiteUrl: 'https://example.com',
      privacyUrl: 'https://example.com/privacy',
      termsOfUseUrl: 'https://example.com/terms',
    },
    icons: { color: 'color.png', outline: 'outline.png' },
    accentColor: '#FFFFFF',
    ...overrides,
  };
}

describe('manifest update command', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockIsAutoConfirm.mockReturnValue(true);
    mockIsInteractive.mockReturnValue(true);
    mockConfirm.mockResolvedValue(true);
    mockValidateTeamsManifestSchema.mockResolvedValue({ valid: true, issues: [] });
    mockUploadManifest.mockResolvedValue(undefined);
    mockDownloadAppPackage.mockReset();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it('dry-runs without prompting or uploading', async () => {
    mockDownloadAppPackage.mockResolvedValueOnce(createPackage(createManifest()));
    const { manifestUpdateCommand } = await import('../src/commands/app/manifest/update.js');

    await manifestUpdateCommand.parseAsync(
      ['test-app-id', '--set-json', 'name.short="New"', '--dry-run'],
      { from: 'user' }
    );

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockUploadManifest).not.toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('Dry run only'));
  });

  it('prompts before upload when --yes is not active', async () => {
    mockIsAutoConfirm.mockReturnValue(false);
    mockDownloadAppPackage
      .mockResolvedValueOnce(createPackage(createManifest()))
      .mockResolvedValueOnce(createPackage(createManifest()))
      .mockResolvedValueOnce(createPackage(createManifest({ name: { short: 'New', full: 'Old' }, version: '1.0.1' })));
    const { manifestUpdateCommand } = await import('../src/commands/app/manifest/update.js');

    await manifestUpdateCommand.parseAsync(['test-app-id', '--set-json', 'name.short="New"'], {
      from: 'user',
    });

    expect(mockConfirm).toHaveBeenCalledWith({
      message: 'Apply these manifest changes?',
      default: true,
    });
    expect(mockUploadManifest).toHaveBeenCalledOnce();
  });

  it('fails fast in non-interactive mode when --yes is not active', async () => {
    mockIsAutoConfirm.mockReturnValue(false);
    mockIsInteractive.mockReturnValue(false);
    const { manifestUpdateCommand } = await import('../src/commands/app/manifest/update.js');

    await expect(
      manifestUpdateCommand.parseAsync(['test-app-id', '--set-json', 'name.short="New"'], {
        from: 'user',
      })
    ).rejects.toThrow('process.exit(1)');

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDownloadAppPackage).not.toHaveBeenCalled();
    expect(mockUploadManifest).not.toHaveBeenCalled();
  });

  it('reports unpreserved changes after upload in JSON mode', async () => {
    mockDownloadAppPackage
      .mockResolvedValueOnce(createPackage(createManifest()))
      .mockResolvedValueOnce(createPackage(createManifest({ version: '1.0.1' })));
    const { manifestUpdateCommand } = await import('../src/commands/app/manifest/update.js');

    await manifestUpdateCommand.parseAsync(
      ['test-app-id', '--set-json', 'bots[0].supportsTargetedMessages=true', '--json'],
      { from: 'user' }
    );

    expect(mockOutputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        verified: false,
        unpreservedChanges: [
          expect.objectContaining({
            path: 'bots[0].supportsTargetedMessages',
            expected: true,
            actual: undefined,
          }),
        ],
      })
    );
    expect(mockDownloadAppPackage).toHaveBeenCalledTimes(2);
  });

  it('blocks upload when schema validation fails and reports structured JSON errors', async () => {
    mockValidateTeamsManifestSchema.mockResolvedValueOnce({
      valid: false,
      issues: [{ path: 'name.short', message: 'invalid', keyword: 'maxLength' }],
    });
    mockDownloadAppPackage.mockResolvedValueOnce(createPackage(createManifest()));
    const { manifestUpdateCommand } = await import('../src/commands/app/manifest/update.js');

    await expect(
      manifestUpdateCommand.parseAsync(
        ['test-app-id', '--set-json', 'name.short="New"', '--json'],
        { from: 'user' }
      )
    ).rejects.toThrow('process.exit(1)');

    expect(mockOutputJson).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: 'VALIDATION_SCHEMA',
        message: 'Manifest schema validation failed:\n  name.short: invalid',
        suggestion: 'No changes uploaded.',
      },
    });
    expect(mockUploadManifest).not.toHaveBeenCalled();
  });
});
