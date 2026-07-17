import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/interactive.js', () => ({
  confirmAction: vi.fn().mockResolvedValue(true),
  isAutoConfirm: vi.fn().mockReturnValue(false),
  isInteractive: vi.fn().mockReturnValue(false),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../src/project/scaffold.js', () => ({
  listTemplates: vi.fn().mockReturnValue(['echo']),
  scaffoldProject: vi.fn().mockResolvedValue(undefined),
}));

describe('project new csharp', () => {
  let originalCwd: string;
  let tempDir: string;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalCwd = process.cwd();
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'teams-cli-csharp-')));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('converts app names to PascalCase without inserting dots', async () => {
    const { projectNewCsharpCommand } = await import('../src/commands/project/new/csharp.js');
    const { scaffoldProject } = await import('../src/project/scaffold.js');

    await projectNewCsharpCommand.parseAsync(['PmAgent', '--template', 'echo'], { from: 'user' });

    expect(scaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'PmAgent',
        language: 'csharp',
        template: 'echo',
        targetDir: path.join(tempDir, 'PmAgent'),
      })
    );
  });

  it.each([
    ['pm-agent', 'PmAgent'],
    ['pm agent', 'PmAgent'],
    ['PM Agent', 'PmAgent'],
    ['MyURLBot', 'MyUrlBot'],
  ])('normalizes %s to %s', async (rawName, expectedName) => {
    const { projectNewCsharpCommand } = await import('../src/commands/project/new/csharp.js');
    const { scaffoldProject } = await import('../src/project/scaffold.js');

    await projectNewCsharpCommand.parseAsync([rawName, '--template', 'echo'], { from: 'user' });

    expect(scaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expectedName,
        targetDir: path.join(tempDir, expectedName),
      })
    );
  });
});
