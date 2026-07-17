import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockInput = vi.fn();
const mockConfirm = vi.fn();
const mockSelect = vi.fn();
const mockConfirmAction = vi.fn();
const mockIsAutoConfirm = vi.fn();
const mockIsInteractive = vi.fn();
const mockRunAppCreate = vi.fn();
const mockListTemplates = vi.fn();
const mockScaffoldProject = vi.fn();

vi.mock('@inquirer/prompts', () => ({
  input: mockInput,
  confirm: mockConfirm,
  select: mockSelect,
}));

vi.mock('../src/utils/interactive.js', () => ({
  confirmAction: mockConfirmAction,
  isAutoConfirm: mockIsAutoConfirm,
  isInteractive: mockIsInteractive,
}));

vi.mock('../src/commands/app/create.js', () => ({
  runAppCreate: mockRunAppCreate,
}));

vi.mock('../src/project/scaffold.js', () => ({
  listTemplates: mockListTemplates,
  scaffoldProject: mockScaffoldProject,
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const appCreateResult = {
  appName: 'PM Agent',
  teamsAppId: 'teams-app-id',
  botId: 'bot-client-id',
  endpoint: null,
  installLink: 'https://teams.microsoft.com/l/app/teams-app-id',
  portalLink: 'https://dev.teams.microsoft.com/apps/teams-app-id',
  botLocation: 'teams-managed' as const,
  credentials: {
    CLIENT_ID: 'bot-client-id',
    CLIENT_SECRET: 'bot-secret',
    TENANT_ID: 'tenant-id',
  },
};

describe('project new app provisioning', () => {
  let originalCwd: string;
  let tempDir: string;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalCwd = process.cwd();
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'teams-cli-project-new-')));
    process.chdir(tempDir);

    mockConfirmAction.mockResolvedValue(true);
    mockIsAutoConfirm.mockReturnValue(false);
    mockIsInteractive.mockReturnValue(true);
    mockListTemplates.mockReturnValue(['echo']);
    mockScaffoldProject.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates the project before optionally provisioning credentials into it', async () => {
    mockInput.mockResolvedValueOnce('PM Agent');
    mockSelect.mockResolvedValueOnce('typescript');
    mockConfirm.mockResolvedValueOnce(true);
    mockRunAppCreate.mockResolvedValueOnce(appCreateResult);

    const { projectNewCommand } = await import('../src/commands/project/new/index.js');

    await projectNewCommand.parseAsync([], { from: 'user' });

    expect(mockScaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'pm-agent',
        language: 'typescript',
        envVars: undefined,
      })
    );
    expect(mockConfirm).toHaveBeenCalledWith({
      message: 'Provision an app now?',
      default: true,
    });
    expect(mockScaffoldProject.mock.invocationCallOrder[0]).toBeLessThan(
      mockConfirm.mock.invocationCallOrder[0]!
    );
    expect(mockRunAppCreate).toHaveBeenCalledWith(
      { env: path.join(tempDir, 'pm-agent', '.env') },
      {
        defaultName: 'PM Agent',
        skipPostCreateActions: true,
      }
    );
  });

  it('keeps the local project name even if the provisioned app name changes', async () => {
    mockInput.mockResolvedValueOnce('PM Agent');
    mockSelect.mockResolvedValueOnce('python');
    mockConfirm.mockResolvedValueOnce(true);
    mockRunAppCreate.mockResolvedValueOnce({
      ...appCreateResult,
      appName: 'Renamed Agent',
    });

    const { projectNewCommand } = await import('../src/commands/project/new/index.js');

    await projectNewCommand.parseAsync([], { from: 'user' });

    expect(mockScaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'pm-agent',
        language: 'python',
      })
    );
    expect(mockRunAppCreate).toHaveBeenCalledWith(
      { env: path.join(tempDir, 'pm-agent', '.env') },
      {
        defaultName: 'PM Agent',
        skipPostCreateActions: true,
      }
    );
  });

  it('shows app-create guidance when app provisioning is skipped', async () => {
    mockInput.mockResolvedValueOnce('PM Agent');
    mockSelect.mockResolvedValueOnce('typescript');
    mockConfirm.mockResolvedValueOnce(false);

    const { logger } = await import('../src/utils/logger.js');
    const { projectNewCommand } = await import('../src/commands/project/new/index.js');

    await projectNewCommand.parseAsync([], { from: 'user' });

    expect(mockRunAppCreate).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('teams app create --name "PM Agent" --env "pm-agent/.env"')
    );
  });

  it('prompts for the project name when project new ts omits it', async () => {
    mockInput.mockResolvedValueOnce('Prompted Agent');
    mockConfirm.mockResolvedValueOnce(false);

    const { projectNewTypescriptCommand } = await import('../src/commands/project/new/typescript.js');

    await projectNewTypescriptCommand.parseAsync(['--template', 'echo'], { from: 'user' });

    expect(mockScaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'prompted-agent',
        language: 'typescript',
      })
    );
  });

  it('routes direct project new ts through app create after scaffolding when provisioning is accepted', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockRunAppCreate.mockResolvedValueOnce(appCreateResult);

    const { projectNewTypescriptCommand } = await import('../src/commands/project/new/typescript.js');

    await projectNewTypescriptCommand.parseAsync(['Direct Agent', '--template', 'echo'], { from: 'user' });

    expect(mockScaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'direct-agent',
        language: 'typescript',
        envVars: undefined,
      })
    );
    expect(mockScaffoldProject.mock.invocationCallOrder[0]).toBeLessThan(
      mockConfirm.mock.invocationCallOrder[0]!
    );
    expect(mockRunAppCreate).toHaveBeenCalledWith(
      { env: path.join(tempDir, 'direct-agent', '.env') },
      {
        defaultName: 'Direct Agent',
        skipPostCreateActions: true,
      }
    );
  });

  it('runs app create with the C# appsettings path after provisioning', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockRunAppCreate.mockResolvedValueOnce(appCreateResult);

    const { createCsharpProject } = await import('../src/commands/project/new/csharp.js');

    await createCsharpProject('PM Agent', { template: 'echo' });

    expect(mockScaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'PmAgent',
        language: 'csharp',
        envVars: undefined,
      })
    );
    expect(mockRunAppCreate).toHaveBeenCalledWith(
      { env: path.join(tempDir, 'PmAgent', 'PmAgent', 'appsettings.Development.json') },
      {
        defaultName: 'PM Agent',
        skipPostCreateActions: true,
      }
    );
  });

  it('removes the local project directory when scaffold fails', async () => {
    mockScaffoldProject.mockImplementationOnce(async (opts: { targetDir: string }) => {
      fs.mkdirSync(opts.targetDir, { recursive: true });
      fs.writeFileSync(path.join(opts.targetDir, 'partial.txt'), 'partial', 'utf8');
      throw new Error('scaffold failed');
    });

    const { createTypescriptProject } = await import('../src/commands/project/new/typescript.js');
    const targetDir = path.join(tempDir, 'pm-agent');

    await expect(createTypescriptProject('PM Agent', { template: 'echo' })).rejects.toThrow(
      'scaffold failed'
    );

    expect(fs.existsSync(targetDir)).toBe(false);
  });
});
